const categories = [
  {
    title: "Biomass and Agricultural byproducts",
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80",
  },
  {
    title: "Industrial Byproducts",
    image: "https://images.unsplash.com/photo-1513828583688-c52646db42da?w=800&q=80",
  },
  {
    title: "Packaging, Used Plastics, Construction, metals, used goods",
    image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&q=80",
  },
  {
    title: "Recovered and Upgraded Materials",
    image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&q=80",
  },
];

function CategoryCard({
  title,
  image,
}: {
  title: string;
  image: string;
}) {
  return (
    <div className="group relative h-[342px] cursor-pointer overflow-hidden rounded-2xl">
      <img
        src={image}
        alt={title}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-start bg-gradient-to-b from-transparent via-black/60 to-neutral-900 p-10 pt-24">
        <h3 className="text-[28px] font-bold leading-9 text-white">{title}</h3>
      </div>
    </div>
  );
}

export function CategoriesSection() {
  return (
    <section className="bg-neutral-100 py-[120px]">
      <div className="mx-auto max-w-[1440px] px-[135px]">
        <h2 className="mb-[60px] text-5xl font-bold text-heading">
          Find materials by category
        </h2>
        <div className="grid grid-cols-2 gap-[30px]">
          {categories.map((cat) => (
            <CategoryCard key={cat.title} {...cat} />
          ))}
        </div>
      </div>
    </section>
  );
}
