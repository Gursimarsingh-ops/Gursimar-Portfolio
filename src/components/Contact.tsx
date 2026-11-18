import { Mail, ArrowUpRight } from "lucide-react";

export function Contact() {
  return (
    <section id="contact" className="relative border-t border-white/10 bg-neutral-950 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500">
              Contact
            </p>
            <h2 className="mt-3 font-serif text-4xl leading-tight tracking-tight text-white md:text-5xl">
              Let&apos;s build something
              <br />
              <span className="text-neutral-500">worth watching.</span>
            </h2>
            <p className="mt-6 max-w-lg text-sm leading-relaxed text-neutral-400 md:text-base">
              Open to professional collaborations across video editing, motion
              graphics, color grading and graphic design. Share your brief and
              I&apos;ll get back to you.
            </p>

            <a
              href="#contact"
              className="group mt-9 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-950 transition-transform hover:-translate-y-0.5"
            >
              Start a Project
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-neutral-200">
                  <Mail className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                    Email
                  </p>
                  <p className="text-sm text-neutral-300">
                    your.email@gmail.com
                  </p>
                </div>
              </div>
              <div className="mt-6 h-px w-full bg-white/10" />
              <dl className="mt-6 space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-neutral-500">Response time</dt>
                  <dd className="text-neutral-300">Within 24 hours</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-neutral-500">Availability</dt>
                  <dd className="text-neutral-300">Open for projects</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-neutral-500">Timezone</dt>
                  <dd className="text-neutral-300">IST (GMT+5:30)</dd>
                </div>
              </dl>
              <p className="mt-6 text-[10px] uppercase tracking-[0.18em] text-neutral-600">
                Email address placeholder · to be provided
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}