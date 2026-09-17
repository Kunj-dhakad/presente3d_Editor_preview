import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { PDFParse } from "pdf-parse";
import { ApiError } from "./api";
import { saveAsset } from "./assets";
import { PAGE_SIZES, type SizeId } from "./ai-book";
import { BOOK_PAGE_LIMIT, PDF_SIZE_LIMIT } from "@shared/aiBook";

/**
 * Flip & photo books: every PDF page or photo becomes one book page holding a
 * single picture. The whole book takes the editor size (portrait, landscape or
 * square) closest to the first page's shape, and every picture is fitted inside
 * it without cropping.
 */

export const PHOTO_SIZE_LIMIT = 15 * 1024 * 1024;
const RENDER_WIDTH = 1400;

type Picture = { url: string; width: number; height: number };

/** The editor size whose shape is closest to width × height. */
export function closestSize(width: number, height: number): SizeId {
  const ratio = width / height;
  let best: SizeId = "portrait";
  let gap = Infinity;
  for (const [id, size] of Object.entries(PAGE_SIZES) as [SizeId, { width: number; height: number }][]) {
    const difference = Math.abs(Math.log(ratio) - Math.log(size.width / size.height));
    if (difference < gap) { gap = difference; best = id; }
  }
  return best;
}

/** One page, one picture, scaled to fit with a small margin and centred. */
export function picturePage(picture: Picture, size: SizeId, background = "#ffffff") {
  const page = PAGE_SIZES[size];
  const margin = Math.round(Math.min(page.width, page.height) * 0.02);
  const scale = Math.min((page.width - margin * 2) / picture.width, (page.height - margin * 2) / picture.height);
  const width = Math.round(picture.width * scale);
  const height = Math.round(picture.height * scale);
  return {
    id: randomUUID(), width: page.width, height: page.height, background,
    elements: [{
      id: randomUUID(),
      data: {
        type: "image", src: picture.url, x: Math.round((page.width - width) / 2), y: Math.round((page.height - height) / 2),
        width, height, fit: "contain", objectFit: "contain", borderRadius: "0px", rotation: 0, opacity: 1, zIndex: 1,
      },
    }],
  };
}

async function storePicture(userId: string, bytes: Buffer, name: string): Promise<Picture> {
  let image;
  try { image = sharp(bytes, { limitInputPixels: 60_000_000 }).rotate(); await image.metadata(); }
  catch { throw new ApiError(400, `${name} is not a readable image.`); }
  const { data, info } = await image.webp({ quality: 88 }).toBuffer({ resolveWithObject: true });
  const asset = await saveAsset(userId, data, "images", name.slice(0, 200), "image/webp", "webp");
  return { url: asset.url, width: info.width, height: info.height };
}

export async function pdfPictures(userId: string, bytes: Buffer, name: string): Promise<Picture[]> {
  if (bytes.length > PDF_SIZE_LIMIT) throw new ApiError(413, "Choose a PDF smaller than 10 MB.");
  if (!bytes.subarray(0, 1024).includes(Buffer.from("%PDF-"))) throw new ApiError(400, "This file is not a valid PDF.");
  const parser = new PDFParse({ data: new Uint8Array(bytes), isEvalSupported: false });
  try {
    const info = await parser.getInfo();
    if (info.total > BOOK_PAGE_LIMIT) throw new ApiError(413, `Choose a PDF with ${BOOK_PAGE_LIMIT} pages or fewer.`);
    const shots = await parser.getScreenshot({ desiredWidth: RENDER_WIDTH, imageBuffer: true, imageDataUrl: false });
    const pictures: Picture[] = [];
    // One page at a time keeps memory flat for long PDFs.
    for (const shot of shots.pages) {
      if (!shot.data) continue;
      pictures.push(await storePicture(userId, Buffer.from(shot.data), `${name} page ${shot.pageNumber}.webp`));
    }
    if (!pictures.length) throw new ApiError(422, "No pages could be read from this PDF.");
    return pictures;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(422, "This PDF could not be read. Try an unlocked PDF.");
  } finally { await parser.destroy(); }
}

export async function photoPictures(userId: string, files: File[]): Promise<Picture[]> {
  if (!files.length) throw new ApiError(400, "Choose at least one photo.");
  if (files.length > BOOK_PAGE_LIMIT) throw new ApiError(413, `Choose up to ${BOOK_PAGE_LIMIT} photos.`);
  const pictures: Picture[] = [];
  for (const file of files) {
    if (file.size > PHOTO_SIZE_LIMIT) throw new ApiError(413, `${file.name} is larger than 15 MB.`);
    pictures.push(await storePicture(userId, Buffer.from(await file.arrayBuffer()), file.name));
  }
  return pictures;
}

export function flipDocument(pictures: Picture[]) {
  const size = closestSize(pictures[0].width, pictures[0].height);
  return { size, slides: pictures.map(picture => picturePage(picture, size)) };
}
