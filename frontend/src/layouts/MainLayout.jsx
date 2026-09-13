import {Link, Outlet} from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
export default function MainLayout(){
    return(
        <>
           <div className="min-h-screen flex flex-col bg-jkuat-green/10 text-slate-900">
          
            <Navbar/>
            <main className="flex-1  w-full mx-auto  p-2 ">
                
                <Outlet />
                
            </main>
            <Footer/>
            </div>
        </>
    )
}