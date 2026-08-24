import logo from "../images/jkuatlogo.png"

export default function Navbar(){
    return(
        <> 
        <header className="sticky w-full z-20 top-0 start-0">
            <nav className="bg-jkuat-green text-white">
                <div className="flex flex-wrap justify-between items-center mx-auto max-w-screen-xl p-4">
                    <a href="" className="flex items-center space-x-3 rtl:space-x-reverse">
                        <img src={logo} className="h-7" alt="Jkuat Logo" />
                        <span className="self-center text-xl text-heading font-semibold whitespace-nowrap">Jkuat Noticeboard</span>
                    </a>
                    <div className="flex items-center space-x-6 rtl:space-x-reverse">
                        <a href="https://www.jkuat.ac.ke" className="text-sm  text-body hover:underline">jkuat website</a>
                        <a href="#" className="text-sm font-medium text-fg-brand hover:underline">Login</a>
                    </div>
                </div>
            </nav>
            <nav className="bg-jkuat-white  shadow-bottom border-default">
                <div className="max-w-screen-xl px-4 py-3 mx-auto">
                    <div className="flex items-center">
                        <ul className="flex flex-row font-medium mt-0 space-x-8 rtl:space-x-reverse text-sm overflow-x-scroll [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                            <li>
                                <a href="#" className="text-heading hover:underline" aria-current="page">Home</a>
                            </li>
                            <li>
                                <a href="#" className="text-heading hover:underline">Students</a>
                            </li>
                            <li>
                                <a href="#" className="text-heading hover:underline">Staff</a>
                            </li>
                            <li>
                                <a href="#" className="text-heading hover:underline">departments</a>
                            </li>
                            <li>
                                <a href="#" className="text-heading hover:underline">courses</a>
                            </li>
                            <li>
                                <a href="#" className="text-heading hover:underline">public</a>
                            </li>
                            <li>
                                <a href="#" className="text-heading hover:underline">Past Notices</a>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>
        </header>

        </>
    )
}