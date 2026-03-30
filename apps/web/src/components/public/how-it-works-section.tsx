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
    <section className="relative overflow-hidden pb-[220px] pt-[120px]">
      {/* Background facility image - positioned bottom-right */}
      <img
        src="/images/facility-bg.png"
        alt=""
        className="pointer-events-none absolute bottom-0 right-0 w-[70%] object-cover object-right-bottom"
      />
      {/* Fade overlay so text stays readable */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white from-40% via-white/80 via-55% to-transparent" />

      <div className="relative z-10 mx-auto max-w-[1440px] px-[135px]">
        <div className="max-w-[608px]">
          <h2 className="mb-16 text-5xl font-bold text-heading">
            A simple flow built for heavy industry
          </h2>
          <div className="flex flex-col gap-10">
            {steps.map((step) => (
              <div key={step.number} className="flex flex-col gap-6">
                <div className="h-px w-full bg-neutral-300" />
                <div className="flex gap-6">
                  <div className="flex size-[34px] shrink-0 items-center justify-center rounded-full text-lg text-neutral-900" style={{ border: "1px solid #BDBDBD" }}>
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
      </div>
    </section>
  );
}
