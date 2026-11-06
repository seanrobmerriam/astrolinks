//render an icon from the SVG repo at https://thesvg.org/icons

function BrandIcon({ slug, size = 24 }: { slug: string; size?: number }) {
  return (
    <img
      src={`https://thesvg.org/icons/${slug}/default.svg`}
      width={size}
      height={size}
      alt={slug}
    />
  );
}

