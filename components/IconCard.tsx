export interface ImageItem {
  id: number;
  filename: string;
  ext: string;
}

export const CARD_W = 128;
export const CARD_H = 160; // image area + filename row

export default function IconCard({ image }: { image: ImageItem }) {
  return (
    <div
      style={{ width: CARD_W }}
      className="flex flex-col items-center shrink-0"
    >
      <div
        style={{ width: CARD_W, height: CARD_W }}
        className="flex items-center justify-center bg-zinc-100 rounded-lg overflow-hidden"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          loading="lazy"
          src={`/api/file?id=${image.id}`}
          alt={image.filename}
          style={{ maxWidth: CARD_W - 16, maxHeight: CARD_W - 16 }}
          className="object-contain"
        />
      </div>
      <p
        style={{ width: CARD_W }}
        className="text-xs text-zinc-500 truncate text-center mt-1 px-1"
        title={image.filename}
      >
        {image.filename}
      </p>
    </div>
  );
}
