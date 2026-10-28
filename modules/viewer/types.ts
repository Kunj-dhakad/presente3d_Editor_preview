/**
 * What the PHP viewer page (ppt-view/<id>) sends with VIEWER_DATA: the row of
 * presentation_settings plus where PHP lives. Field names follow the PHP view
 * (application/views/default/presentation/ppt_view.php) so the two are easy
 * to compare.
 */
export type ViewerSettings = {
  ppt_id: string;
  user_id: string;
  business_id: string;
  presentation_name: string;

  /** 0: no avatar; otherwise the avatar video (or its image while it is processed) sits beside the slides. */
  avatar_setting: number;
  avt_video_path: string;
  avt_img_path: string;
  /** Image on the welcome modal when there is an avatar. */
  avt_greeting_video: string;
  selected_agent_type: string;

  auto_play: boolean;
  ask_ques: boolean;
  slides_panel: boolean;
  chat_panel: boolean;

  lead_form: boolean;
  /** The slide visit (1-based count) at which the lead form opens. */
  lead_form_delay: number;
  autoresponder_id: string;
  auto_list_id: string;

  feedback_form: boolean;
  /** "1" emoji, "2" stars, "3" meter. */
  feedback_form_type: string;
  thank_you_msg: boolean;

  welcome_status: boolean;
  welcome_text: string;

  slide_animation: boolean;
  /** 1-based index into ANIMATIONS. */
  animation: number;

  subtitle_text_color: string;
  subtitle_background_color: string;

  voice_id: string;
  voice_type: number;
  response_length: number;

  /** Narration audio URL per slide. */
  subtitle_audio: string[];
  preview_url: string;
};

export type ViewerEnv = {
  /** PHP base URL, ending with "/": its endpoints (txt-to-speech, get-ai-respo, …) hang off it. */
  site_url: string;
  /** PHP images folder, ending with "/" (app/assets/images/). */
  assets_url: string;
  /** CDN base, ending with "/" (reaction images). */
  bucket_url: string;
  /** White-label footer logo and its link. */
  logo_url: string;
  logo_link: string;
  /** Whether the PHP page has somewhere to go back to (shows the back arrow). */
  can_go_back: boolean;
  /** "owner": the creator's own preview, so visits, chats and leads are not recorded. */
  mode: "public" | "owner";
};

export type ViewerData = {
  settings?: Partial<ViewerSettings>;
  env?: Partial<ViewerEnv>;
  /** The slide JSON itself (PHP has already read it); otherwise LOAD_TEMPLATE's URL is fetched. */
  document?: unknown;
};

/** Same order as PPT.state.anims in the PHP viewer (assets/presentation/js/config.js). */
export const ANIMATIONS = ["fadeSlide", "zoom", "flip", "cube", "blur", "curtain", "rotate", "swipe", "vertical", "push", "elastic", "drop", "reveal", "ripple", "fold", "swing", "bounce", "flash"];

/** Used when the page sends no settings (opened from the editor or with ?template=). */
export const DEFAULT_SETTINGS: ViewerSettings = {
  ppt_id: "",
  user_id: "",
  business_id: "",
  presentation_name: "Presentation",
  avatar_setting: 0,
  avt_video_path: "",
  avt_img_path: "",
  avt_greeting_video: "",
  selected_agent_type: "photo",
  auto_play: false,
  ask_ques: false,
  slides_panel: true,
  chat_panel: false,
  lead_form: false,
  lead_form_delay: 0,
  autoresponder_id: "",
  auto_list_id: "",
  feedback_form: false,
  feedback_form_type: "1",
  thank_you_msg: false,
  welcome_status: false,
  welcome_text: "",
  slide_animation: true,
  animation: 1,
  subtitle_text_color: "#ffffff",
  subtitle_background_color: "#5e5e5e79",
  voice_id: "henry",
  voice_type: 1,
  response_length: 30,
  subtitle_audio: [],
  preview_url: "",
};

export const DEFAULT_ENV: ViewerEnv = {
  site_url: "",
  assets_url: "",
  bucket_url: "",
  logo_url: "",
  logo_link: "#",
  can_go_back: false,
  mode: "owner",
};

/** The fields of a raw slide the viewer reads besides what the renderer draws. */
export type RawSlide = { subtitle_text?: string; width?: number; height?: number };
