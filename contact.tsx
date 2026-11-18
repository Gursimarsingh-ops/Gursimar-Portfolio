import { Mail, MessageCircle, Palette, ArrowUpRight } from "lucide-react";

const CHANNELS = [
  {
    icon: Mail,
    label: "Gmail",
    value: "Add your email",
    note: "Placeholder",
    href: "#contact",
  },
  {
    icon: MessageCircle,
    label: "Discord",
    value: "Add your username",
    note: "Placeholder",
    href: "#contact",
  },
  {
    icon: Palette,
    label: "Behance",
    value: "Add your portfolio URL",
    note: "Placeholder",
    href: "#contact",
  },
];

export function Contact({ onStartProject }: { onStartProject: () => void }) {
  return (
    <section id="contact" className="relative border-t border-neutral-200 bg-neutral-50 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500">
              Contact
            </p>
            <h2 className="mt-3 font-serif text-4xl leading-tight tracking-tight text-neutral-950 md:text-5xl">
              Let&apos;s build something
              <br />
              <span className="text-neutral-400">worth watching.</span>
            </h2>
            <p className="mt-6 max-w-lg text-sm leading-relaxed text-neutral-500 md:text-base">
              Open to professional collaborations across video editing, motion
              graphics, color grading and graphic design. Share your brief and
              I&apos;ll get back to you.
            </p>

            <button
              onClick={onStartProject}
              className="group mt-9 inline-flex items-center gap-2 rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-neutral-700 active:translate-y-0"
            >
              Start a Project
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>

          <div className="lg:col-span-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {CHANNELS.map((c) => (
                <a
                  key={c.label}
                  href={c.href}
                  className="group flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-neutral-900 hover:shadow-lg"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-700 transition-all group-hover:rotate-6 group-hover:border-neutral-900 group-hover:bg-neutral-900 group-hover:text-white">
                    <c.icon className="h-5 w-5" />
                  </span>
                  <div className="mt-6">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">
                      {c.label}
                    </p>
                    <p className="mt-1 break-all text-sm font-medium text-neutral-900">
                      {c.value}
                    </p>
                    <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-neutral-400">
                      {c.note}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}