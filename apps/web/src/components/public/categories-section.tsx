const categories = [
  {
    title: "Biomass and Agricultural byproducts",
    image: "/images/category-biomass.jpg",
  },
  {
    title: "Industrial Byproducts",
    image: "/images/category-industrial.jpg",
  },
  {
    title: "Packaging, Used Plastics, Construction, metals, used goods",
    image: "/images/category-packaging.jpg",
  },
  {
    title: "Recovered and Upgraded Materials",
    image: "/images/category-recovered.jpg",
  },
];

function CategoryCard({
  title,
}: {
  title: string;
  image?: string;
}) {
  return (
    <div className="group relative h-[342px] cursor-pointer overflow-hidden rounded-2xl">
      <div className="absolute inset-0 bg-neutral-300 transition-transform duration-300 group-hover:scale-105" />
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
