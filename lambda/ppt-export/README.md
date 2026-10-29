# ppt-export Lambda

PowerPoint export (`modules/shared/server/pptx.ts`) as an AWS Lambda. It runs the same checks and code as
`/api/generate-ppt`, with more time and memory than the Amplify server function, which returns 502 on large decks.

## Build

```
npm run build:ppt-lambda
```

This writes `lambda/ppt-export/ppt-export.zip`: the bundled `index.js`, plus `sharp` built for Linux x64.

## Create the function (AWS console, us-east-1)

1. **Lambda → Create function.**
   - Runtime: Node.js 22.x.
   - Architecture: x86_64.
   - Upload `ppt-export.zip`.
   - Handler: `index.handler`.
2. **Configuration → General.**
   - Memory: 2048 MB.
   - Timeout: 5 min.
3. **Configuration → Environment variables.** Use the same values as the editor's Amplify app.

   | Name | Value |
   |---|---|
   | `APP_URL` | `https://main.d1p30vxhcuivlf.amplifyapp.com`. Files are linked with it, and only this origin may call. |
   | `PHP_TOKEN_KEY` | Same as the editor's. Leave it empty only if the editor's is empty. |
   | `KD_AWS_S3_BUCKET_NAME`, `KD_AWS_REGION` | The editor's bucket. |
   | `STORAGE_PREFIX` | Same as the editor's. The default is `ppt_editor_data`. |
   | `KD_AWS_ACCESS_KEY_ID`, `KD_AWS_SECRET_ACCESS_KEY` | Optional. Without them, the function's role is used. The role then needs `s3:GetObject` and `s3:PutObject` on the bucket. |
4. **Configuration → Function URL → Create.**
   - Auth type: NONE. The PHP access token is checked in the code.
   - Enable CORS:
     - Allow origin: `https://main.d1p30vxhcuivlf.amplifyapp.com`
     - Allow headers: `content-type, x-access-token`
     - Allow methods: `POST`
5. **Point the editor at it.** In the editor's Amplify app, set `NEXT_PUBLIC_PPT_EXPORT_URL` to the Function URL, then redeploy.
   - `NEXT_PUBLIC_*` values are read at build time, so a new build is needed.
   - With the value empty, exports go to `/api/generate-ppt` again.

## Updating

After changing the export code:
1. Run `npm run build:ppt-lambda`.
2. In the Lambda console, use **Code → Upload from → .zip file** with the new `ppt-export.zip`.
