import * as React from "react"
import { useEffect, useRef } from "react"
import { NeatGradient } from "@firecms/neat"
import { motion, useReducedMotion } from "framer-motion"
import { Link } from "react-router-dom"
import {
  BookOpenIcon,
  CircleHelpIcon,
  FileTextIcon,
  LockKeyholeIcon,
  MailIcon,
  NotebookPenIcon,
  ScaleIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserRoundIcon,
  WalletCardsIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface FooterLink {
  title: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
}

interface FooterLinkGroup {
  label: string
  links: FooterLink[]
}

type StickyFooterProps = React.ComponentProps<"footer">

const socialLinks = [
  { title: "Follow xaujournal on X", href: "https://x.com/xau_journal", icon: "x" },
  { title: "Join the xaujournal Discord", href: "https://discord.gg/smbNwBZC2", icon: "discord" },
  { title: "Follow xaujournal on Facebook", href: "https://www.facebook.com/xaujournal", icon: "facebook" },
  { title: "Follow xaujournal on Instagram", href: "https://www.instagram.com/xaujournal", icon: "instagram" },
  { title: "Email xaujournal", href: "mailto:info@xaujournal.com", icon: MailIcon },
]

function BrandIcon({ name }: { name: string | React.ComponentType<{ className?: string }> }) {
  if (typeof name !== "string") {
    const Icon = name
    return <Icon className="size-4" />
  }
  const paths: Record<string, string> = {
    x: "M18.9 2H22l-6.77 7.74L23.2 22h-6.24l-4.89-6.39L6.48 22H3.36l7.25-8.29L2.96 2H9.36l4.42 5.84L18.9 2Zm-1.09 17.84h1.73L8.42 4.05H6.57l11.24 15.79Z",
    discord: "M19.54 5.34A16.6 16.6 0 0 0 15.44 4c-.2.36-.44.84-.6 1.22a15.4 15.4 0 0 0-4.68 0A12.7 12.7 0 0 0 9.54 4a16.8 16.8 0 0 0-4.1 1.35C2.84 9.2 2.14 12.95 2.5 16.65a16.5 16.5 0 0 0 5.03 2.55c.41-.55.77-1.14 1.08-1.76-.6-.23-1.18-.51-1.73-.84l.43-.33c3.34 1.55 6.97 1.55 10.27 0l.44.33c-.55.33-1.13.61-1.74.84.31.62.67 1.21 1.08 1.76a16.4 16.4 0 0 0 5.03-2.55c.43-4.29-.74-8-2.85-11.31ZM8.84 14.38c-1 0-1.83-.93-1.83-2.07 0-1.15.8-2.08 1.83-2.08 1.02 0 1.85.94 1.83 2.08 0 1.14-.8 2.07-1.83 2.07Zm6.34 0c-1 0-1.83-.93-1.83-2.07 0-1.15.8-2.08 1.83-2.08 1.02 0 1.85.94 1.83 2.08 0 1.14-.8 2.07-1.83 2.07Z",
    facebook: "M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.87.24-1.46 1.5-1.46h1.7V4a22 22 0 0 0-2.47-.13c-2.45 0-4.13 1.5-4.13 4.27V10H7.3v3h2.8v8h3.4Z",
    instagram: "M7.2 3h9.6A4.2 4.2 0 0 1 21 7.2v9.6a4.2 4.2 0 0 1-4.2 4.2H7.2A4.2 4.2 0 0 1 3 16.8V7.2A4.2 4.2 0 0 1 7.2 3Zm-.1 1.8A2.3 2.3 0 0 0 4.8 7.1v9.8a2.3 2.3 0 0 0 2.3 2.3h9.8a2.3 2.3 0 0 0 2.3-2.3V7.1a2.3 2.3 0 0 0-2.3-2.3H7.1Zm9.9 1.35a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1ZM12 7.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5Zm0 1.8A2.7 2.7 0 1 0 14.7 12 2.7 2.7 0 0 0 12 9.3Z",
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name]} /></svg>
}

const footerLinkGroups: FooterLinkGroup[] = [
  {
    label: "Product",
    links: [
      { title: "The trading desk", href: "/", icon: NotebookPenIcon },
      { title: "Plans", href: "/pricing", icon: WalletCardsIcon },
      { title: "Start free", href: "/login?mode=signup", icon: SparklesIcon },
    ],
  },
  {
    label: "Study",
    links: [
      { title: "Field notes", href: "/blogs", icon: BookOpenIcon },
      { title: "Contact", href: "/contact", icon: CircleHelpIcon },
      { title: "Sign in", href: "/login?mode=signin", icon: UserRoundIcon },
    ],
  },
  {
    label: "Trust",
    links: [
      { title: "Privacy policy", href: "/privacy", icon: LockKeyholeIcon },
      { title: "Terms of service", href: "/terms-and-conditions", icon: ScaleIcon },
      { title: "Payment & cancellation", href: "/refund-policy", icon: FileTextIcon },
    ],
  },
]

export function StickyFooter({ className, style, ...props }: StickyFooterProps) {
  const gradientRef = useRef<HTMLCanvasElement>(null)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    if (!gradientRef.current || shouldReduceMotion) return undefined
    const gradient = new NeatGradient({
      ref: gradientRef.current,
      colors: [{ color: "#DFFF00", enabled: true }, { color: "#55A630", enabled: true }, { color: "#E63946", enabled: true }, { color: "#FF7A00", enabled: true }, { color: "#111A08", enabled: true }, { color: "#000000", enabled: true }],
      speed: 1.8,
      horizontalPressure: 2,
      verticalPressure: 5,
      waveFrequencyX: 2,
      waveFrequencyY: 2,
      waveAmplitude: 4,
      backgroundColor: "#000000",
      backgroundAlpha: 1,
      wireframe: true,
      colorBlending: 5,
      colorBrightness: 1.15,
      colorSaturation: 12,
      resolution: 0.9,
      yOffsetWaveMultiplier: 3.5,
      yOffsetColorMultiplier: 3.5,
      yOffsetFlowMultiplier: 3.5,
    })
    return () => gradient.destroy()
  }, [shouldReduceMotion])

  return (
    <footer
      className={cn("xj dark relative h-[min(720px,100svh)] min-h-[620px] w-full", className)}
      style={{ ...style, clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" }}
      data-ux-skip="true"
      {...props}
    >
      <div className="fixed bottom-0 h-[min(720px,100svh)] min-h-[620px] w-full bg-background text-foreground">
        <div className="sticky top-[calc(100svh-min(720px,100svh))] h-full overflow-y-auto">
          <div className="relative flex size-full flex-col justify-between gap-8 overflow-hidden border-t border-border bg-black/75 px-5 py-8 md:px-10 lg:px-12">
            <div aria-hidden className="pointer-events-none absolute inset-0 isolate overflow-hidden">
              <canvas ref={gradientRef} className="absolute inset-0 size-full opacity-20" aria-hidden="true" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.88),rgba(3,5,8,.7)_48%,rgba(3,5,8,.94))]" />
              <div className="absolute -left-48 -top-80 size-[48rem] rotate-[-24deg] rounded-full bg-[radial-gradient(circle,rgba(184,255,0,.08),transparent_66%)]" />
              <div className="absolute -right-64 top-10 size-[44rem] rounded-full bg-[radial-gradient(circle,rgba(184,255,0,.1),transparent_68%)]" />
              <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-[Handjet] text-[clamp(5rem,17vw,14rem)] font-semibold leading-none tracking-[-0.055em] text-foreground/[0.08]">
                xau<span className="text-primary/60">/</span>journal
              </p>
            </div>

            <div className="relative mt-6 flex flex-col gap-10 md:flex-row md:gap-8 xl:mt-0">
              <AnimatedContainer className="flex w-full max-w-sm min-w-0 flex-col gap-4 md:mr-auto">
                <Link to="/" className="w-fit font-[Handjet] text-3xl font-semibold tracking-[-0.03em]">
                  xau<span className="text-primary">/</span>journal
                </Link>
                <p className="max-w-xs text-sm leading-relaxed text-slate-200/90">
                  One focused record for XAU/USD traders: every fill kept, every session measured, every decision made reviewable.
                </p>
                <div className="xj-sticky-social-buttons flex gap-2" aria-label="Social links">
                    {socialLinks.map((link) => (
                    <Button
                      key={link.href}
                      render={
                        <a
                          href={link.href}
                          aria-label={link.title}
                          title={link.title}
                          target={link.href.startsWith("http") ? "_blank" : undefined}
                          rel={link.href.startsWith("http") ? "noreferrer" : undefined}
                        />
                      }
                      nativeButton={false}
                      size="icon"
                      variant="outline"
                      className="border-white/30 bg-black/50 text-slate-100 shadow-none hover:border-primary hover:bg-primary/10 hover:text-primary hover:shadow-[0_0_22px_rgba(184,255,0,.25)]"
                    >
                      <BrandIcon name={link.icon} />
                    </Button>
                  ))}
                </div>
              </AnimatedContainer>

              {footerLinkGroups.map((group, index) => (
                <AnimatedContainer
                  key={group.label}
                  delay={0.08 + index * 0.08}
                  className="w-full md:max-w-48"
                >
                  <div className="flex flex-col gap-4">
                    <h3 className="text-sm uppercase tracking-[0.14em] text-foreground">{group.label}</h3>
                    <ul className="flex flex-col gap-2 text-sm text-slate-200/90">
                      {group.links.map((link) => (
                        <li key={link.title}>
                          <Link to={link.href} className="group inline-flex min-h-8 items-center gap-2 transition-colors duration-300 hover:text-foreground">
                            {link.icon ? <link.icon className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-[-4deg]" /> : null}
                            {link.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </AnimatedContainer>
              ))}
            </div>

            <AnimatedContainer delay={0.3} className="relative flex flex-col gap-5 border-t border-white/20 pt-4">
              <div className="flex items-center gap-2 text-xs text-slate-200/85">
                <ShieldCheckIcon className="size-4" />
                <span>Analytics and record-keeping only. No trade execution or investment advice.</span>
              </div>
              <div className="flex flex-col justify-between gap-2 text-xs text-slate-200/85 md:flex-row">
                <p>© {new Date().getFullYear()} xaujournal. All rights reserved.</p>
                <p className="font-mono">XAU/USD spot · session times UTC</p>
              </div>
            </AnimatedContainer>
          </div>
        </div>
      </div>
    </footer>
  )
}

type AnimatedContainerProps = React.ComponentProps<typeof motion.div> & {
  children?: React.ReactNode
  delay?: number
}

function AnimatedContainer({ delay = 0.1, children, ...props }: AnimatedContainerProps) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) return <div className={props.className}>{children}</div>

  return (
    <motion.div
      initial={{ filter: "blur(4px)", translateY: -8, opacity: 0 }}
      whileInView={{ filter: "blur(0px)", translateY: 0, opacity: 1 }}
      viewport={{ once: true, amount: 0.22 }}
      transition={{ delay, duration: 0.65, ease: [0.2, 0.7, 0.3, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  )
}
