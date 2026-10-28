# Presentation Editor (editor + preview for the PHP app)

This Next.js app is only the **presentation editor** and the **presentation preview**.
The PHP app (CI_Core) owns everything else: login, users, presentations, the database
and file storage. It opens these two pages in an iframe:

| PHP page | iframe | What it does |
| --- | --- | --- |
| `edit-presentation/<id>` | `/` | Edit the slides. Autosaves to PHP; **Publish** sends the PPT, thumbnail and slide images to PHP. |
| `preview-presentation/<id>` | `/preview` | Full-page preview of the slides (slide view by default, flipbook and vertical also available). |

There is no database, login or sign-up here.

## How the iframe and PHP talk

```
iframe → PHP   REACT_READY              the page is listening
PHP → iframe   INIT_DATA                { id, name, token, URL }   URL = PHP base URL, e.g. https://app.pitchoraai.com/
PHP → iframe   LOAD_TEMPLATE            { templateUrl }            the presentation JSON on the CDN
iframe → PHP   LOADER_ON / LOADER_OFF   PHP shows or hides its full-page loader
iframe → PHP   PUBLISH_CLICKED          published; PHP goes to customize-slide/<id>
iframe → PHP   EDITOR_BACK              back arrow (after saving); PHP goes to presentation-listing
```

`modules/shared/parentBridge.ts` implements this. The PHP side is
`application/views/default/presentation/editor/presentation_editor.php` and `presentation_preview.php`.

Opened directly, without a parent page, the editor reads the same data from the query string,
which is handy in development:
`/?id=14&token=<access_token>&api=https://app.example.com/&template=<json url>`

## The preview is the pitch viewer

`/preview` is the PHP app's pitch viewer (`ppt-view/<id>`) rebuilt in React (`modules/viewer/`): welcome
modal, narration with word-by-word subtitles, avatar video, AI chat ("Ask Question", typed or by voice with
slide commands), cards panel, lead form, feedback, thank-you and share modals, slide animations, visit counts.
It keeps the PHP viewer's markup and stylesheet (`public/viewer/presentation_view.css`, unchanged), and calls
the same PHP endpoints (`txt-to-speech`, `get-ai-respo`, `save-chat-history`, `feedback-submit`,
`autoresponder_datasender`, slide/presentation/share counts).

The PHP page sends `VIEWER_DATA` after `REACT_READY`: `{ settings, env, document }`, built by
`application/helpers/ppt_viewer_helper.php`. `ppt-view/<id>` uses it when `$config['ppt_viewer_next']` is TRUE;
`preview-presentation/<id>` (the owner's preview) always does, in `owner` mode, which records nothing.

## Where data goes

**PHP endpoints** (`Presentation_Editor_Api_Controller`), called as `<URL><action>` with `id` + `access_token` in the form:

| Action | Used for |
| --- | --- |
| `sl_editor_json_auto_save_upload` | autosave (slide JSON only) |
| `sl_editor_json_ppt_upload` | publish (JSON + PPT URL + thumbnail + slide images zip) |
| `sl_editor_video_title_update` | rename |
| `sl_editor_image_upload`, `sl_editor_listing`, `uploadImageDelete` | uploaded images |
| `sl_editor_Ai_generate_image`, `sl_editor_Ai_generate_image_list`, `aiGenerateImageDelete` | AI images |
| `sl_editor_crop_image` | cropped images, watermark images |
| `sl_editor_video_upload`, `sl_editor_video_listing`, `uploadVideoDelete` | uploaded videos |

**This app's own `/api` routes** do work that needs server keys: AI text, AI slides, quizzes, copilot,
PowerPoint/PDF export, stock photos (Pexels), GIFs, stickers, fonts, background removal, narration (TTS).
Every request carries the PHP access token in the `x-access-token` header (`modules/shared/apiFetch.ts`);
the server decrypts it the way PHP's `decript_user_token()` does (`modules/shared/server/phpToken.ts`).
Files this app makes (PPT exports, AI images, cut-out images) go to S3 and are served from `/api/files/<key>`.

**Library** (elements, backgrounds, text styles, templates) is the same for every user, so it ships as JSON
in `data/library/`. To refresh it from the old book-editor database: `npm i --no-save mysql2`, set `MYSQL_*`,
then `npm run library:export`.

## Run

```bash
npm install
cp .env.example .env     # fill in APP_URL, S3 and the AI keys
npm run dev              # http://localhost:3000
npm run build && npm start
```

In the PHP app, set `$config['ppt_editor_url']` in `application/config/config.php` to this app's URL (ending with `/`).

### Settings that must match the deployment

* `APP_URL` – this app's public URL. API calls from any other origin are refused, and stored files are linked with it.
* `NEXT_PUBLIC_PARENT_ORIGINS` – the PHP origins allowed to send INIT_DATA (build time). Empty accepts any; set it in production.
* `FRAME_ANCESTORS` – extra pages allowed to frame this app (build time). The PHP domains are listed in `next.config.ts`.
* `PHP_TOKEN_KEY` – only if PHP's token key changes.

## Commands

| Command | |
| --- | --- |
| `npm run dev` | development server |
| `npm run build` / `npm start` | production build / server |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm run library:export` | refresh `data/library/*.json` from the old database |
