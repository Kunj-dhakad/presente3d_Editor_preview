import "react";
declare module "react" {
  interface AudioHTMLAttributes<T> {
    volume?: number;
  }
}
