import logo from "../images/jkuatlogo.png"

const resources = [
    { label: "JKUAT Website", href: "https://www.jkuat.ac.ke/" },
    { label: "Discover JKUAT", href: "https://discover.jkuat.ac.ke" },
    { label: "Student Resources", href: "https://www.jkuat.ac.ke/student-resources/" },
    { label: "News", href: "https://www.jkuat.ac.ke/news/" },
]

const help = [
    { label: "FAQ", href: "https://www.jkuat.ac.ke/faq/" },
    { label: "Contact Us", href: "https://www.jkuat.ac.ke/contact-us/" },
    { label: "Map and Directions", href: "https://www.jkuat.ac.ke/map-and-directions/" },
]

const social = [
    {
        label: "Facebook",
        href: "https://www.facebook.com/DiscoverJKUAT",
        icon: (
            <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M13.135 6H15V3h-1.865a4.147 4.147 0 0 0-4.142 4.142V9H7v3h2v9.938h3V12h2.021l.592-3H12V6.591A.6.6 0 0 1 12.592 6h.543Z" clipRule="evenodd" />
            </svg>
        ),
    },
    {
        label: "Twitter",
        href: "https://twitter.com/DiscoverJKUAT",
        icon: (
            <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13.795 10.533 20.68 2h-3.073l-5.255 6.517L7.69 2H1l7.806 10.91L1.47 22h3.074l5.705-7.07L15.31 22H22l-8.205-11.467Zm-2.38 2.95L9.97 11.464 4.36 3.627h2.31l4.528 6.317 1.443 2.02 6.018 8.409h-2.31l-4.934-6.89Z" />
            </svg>
        ),
    },
    {
        label: "Instagram",
        href: "https://www.instagram.com/discoverjkuat/",
        icon: (
            <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
            </svg>
        ),
    },
    {
        label: "YouTube",
        href: "https://www.youtube.com/@discoverjkuat",
        icon: (
            <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.3 5 12 5 12 5s-6.3 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2C2 8.76 2 12 2 12s0 3.24.4 4.8a2.5 2.5 0 0 0 1.76 1.77C5.7 19 12 19 12 19s6.3 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77C22 15.24 22 12 22 12s0-3.24-.4-4.8ZM10 15V9l5.2 3L10 15Z" clipRule="evenodd" />
            </svg>
        ),
    },
]

function LinkColumn({ title, links }) {
    return (
        <div>
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-white/60">
                {title}
            </h2>
            <ul className="space-y-3">
                {links.map((link) => (
                    <li key={link.href}>
                        <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group inline-flex items-center gap-1.5 text-sm font-medium text-white/90 transition-colors hover:text-white"
                        >
                            <span className="border-b border-transparent transition-colors group-hover:border-white/60">
                                {link.label}
                            </span>
                            <span className="translate-y-0.5 text-xs opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100" aria-hidden="true">
                                ↗
                            </span>
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default function Footer() {
    return (
        <footer className="bg-jkuat-green text-white">
            <div className="mx-auto w-full max-w-screen-xl px-6 pt-14 pb-8 lg:px-8">
                <div className="grid gap-12 lg:grid-cols-12">
                    <div className="lg:col-span-6">
                        <a href="/" className="inline-flex items-center gap-3">
                            <img src={logo} className="h-9 w-auto" alt="JKUAT Logo" />
                            <span className="text-2xl font-extrabold tracking-tight">
                                JKUAT Noticeboard
                            </span>
                        </a>
                        <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/70">
                            Official notices and events from across the university, all in one place.
                        </p>
                        <div className="mt-8 flex items-center gap-3">
                            {social.map((item) => (
                                <a
                                    key={item.label}
                                    href={item.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-jkuat-green"
                                >
                                    {item.icon}
                                    <span className="sr-only">{item.label}</span>
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 lg:col-span-6 lg:pl-10">
                        <LinkColumn title="Resources" links={resources} />
                        <LinkColumn title="Help" links={help} />
                    </div>
                </div>

                <div className="mt-14 flex flex-col gap-3 border-t border-white/15 pt-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                        &copy; {new Date().getFullYear()}{" "}
                        <a
                            href="https://www.jkuat.ac.ke"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-white/80 transition-colors hover:text-white"
                        >
                            Jomo Kenyatta University of Agriculture and Technology
                        </a>
                        . All rights reserved.
                    </span>
                    <span>Discover JKUAT</span>
                </div>
            </div>
        </footer>
    )
}