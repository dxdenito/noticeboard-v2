import {Link, Outlet} from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
export default function MainLayout(){
    return(
        <>
           <div className="min-h-screen flex flex-col bg-white text-slate-900">
          
            <Navbar/>
            <main className="flex-1 max-w-7xl w-full mx-auto  p-2 md:p-6">
                
                <Outlet />
                
            </main>
            <Footer/>
            </div>
        </>
    )
}