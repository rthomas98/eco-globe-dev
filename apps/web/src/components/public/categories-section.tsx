const categories = [
  {
    title: "Industrial Byproducts",
    image: "/images/category-industrial-byproducts.png",
  },
  {
    title: "Low CO₂ feedstocks",
    image: "/images/category-low-co2-feedstocks.png",
  },
  {
    title: "Certified Feedstocks",
    image: "/images/category-certified-feedstocks.png",
  },
  {
    title: "Used products",
    image: "/images/category-used-products.png",
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
    <div className="group relative h-[200px] sm:h-[280px] lg:h-[342px] cursor-pointer overflow-hidden rounded-2xl">
      <img
        src={image}
        alt={title}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-start bg-gradient-to-b from-transparent via-black/60 to-neutral-900 p-6 sm:p-10 pt-16 sm:pt-24">
        <h3 className="text-xl sm:text-2xl lg:text-[28px] font-bold leading-7 sm:leading-9 text-white">{title}</h3>
      </div>
    </div>
  );
}

export function CategoriesSection() {
  return (
    <section className="bg-neutral-100 py-16 lg:py-[120px]">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[135px]">
        <h2 className="mb-8 lg:mb-[60px] text-2xl sm:text-4xl lg:text-5xl font-bold text-heading">
          Find materials by category
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[30px]">
          {categories.map((cat) => (
            <CategoryCard key={cat.title} {...cat} />
          ))}
        </div>
      </div>
    </section>
  );
}
