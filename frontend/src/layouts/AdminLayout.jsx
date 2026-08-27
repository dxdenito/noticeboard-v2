import {Link, Outlet} from 'react-router-dom'
import AdminNavbar from '../components/admin/AdminNavbar'
import AdminFooter from '../components/admin/AdminFooter'
export default function MainLayout(){
    return(
        <>
           <div className="min-h-screen flex flex-col bg-white text-slate-900">
          
            <AdminNavbar/>
            <main className="flex-1 max-w-7xl w-full mx-auto  p-2 md:p-6">
                
                <Outlet />
                
            </main>
            <AdminFooter/>
            </div>
        </>
    )
}