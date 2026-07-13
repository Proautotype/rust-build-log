interface Props {
  images: { src: string; alt: string }[];
}

export function ImageGallery({ images }: Props) {
  if (!images.length) return null;
  return (
    <div className="my-6 grid grid-cols-2 gap-2 md:grid-cols-3">
      {images.map((img, i) => (
        <div
          key={i}
          className="aspect-[4/3] overflow-hidden rounded-md border border-border bg-surface-2"
        >
          <img
            src={img.src}
            alt={img.alt}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          />
        </div>
      ))}
    </div>
  );
}
