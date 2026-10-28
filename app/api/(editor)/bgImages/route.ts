// The built-in catalogue is the same for everyone, so it needs no token (the editor also opens on its own).
import {NextResponse} from "next/server";
import {apiError} from "@shared/server/api";
import {libraryItems} from "@shared/server/library";
export async function GET(){try{return NextResponse.json(libraryItems("background"));}catch(e){return apiError(e);}}
