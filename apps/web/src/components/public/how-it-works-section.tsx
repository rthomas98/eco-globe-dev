const steps = [
  {
    number: 1,
    title: "Define your need",
    description: "Search by feedstock type, specs, volume, and location.",
  },
  {
    number: 2,
    title: "Compare compatible options",
    description:
      "See distance, delivery time, and carbon impact instantly.",
  },
  {
    number: 3,
    title: "Execute with confidence",
    description:
      "Logistics, tracking, and documentation are handled in one place.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-[120px]">
      <div className="mx-auto max-w-[1440px] px-[135px]">
        <div className="flex gap-16">
          <div className="flex w-[608px] shrink-0 flex-col gap-16">
            <h2 className="text-5xl font-bold text-heading">
              A simple flow built for heavy industry
            </h2>
            <div className="flex flex-col gap-10">
              {steps.map((step) => (
                <div key={step.number} className="flex flex-col gap-6">
                  <div className="h-px w-full bg-neutral-300" />
                  <div className="flex gap-6">
                    <div className="flex size-[34px] shrink-0 items-center justify-center rounded-full border border-neutral-400 text-lg text-neutral-900">
                      {step.number}
                    </div>
                    <div className="flex flex-col gap-4">
                      <h3 className="text-[28px] font-medium leading-9 text-neutral-900">
                        {step.title}
                      </h3>
                      <p className="text-lg leading-7 text-neutral-800">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="min-h-[500px] flex-1 overflow-hidden rounded-2xl">
            <img
              src="https://images.unsplash.com/photo-1494412574643-ff11b0a5eb19?w=800&q=80"
              alt="Aerial view of a shipping port with logistics operations"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
