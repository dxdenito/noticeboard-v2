import image from '../images/image-1.jpg'
export default function Feed(){
    return(
        <>

        <h1 className="w-full text-center text-2xl">Welcome to noticeboard</h1>

        
        <div className="relative flex py-5 items-center border-slate-200 ">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="flex-shrink mx-4 text-jkuat-red font-medium">Pinned Notices</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>
        <div className="flex flex-row overflow-x-scroll [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ">
            <div className="flex w-[450px] max-w-full flex-row overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm flex-shrink-0 m-2">
              {/* Left: Image Section */}
              <div className="w-1/3 flex-shrink-0">
                <img 
                  src={image}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Right: Content & Action Section */}
              <div className="flex w-2/3 bg-jkuat-white flex-col justify-between p-4">
                <div>
                  <h3 className="text-lg font-bold text-jkuat-red line-clamp-1">Sale of cabbages by the farm and other text to see how long this can go</h3>
                  <p className="mt-1 text-sm text-slate-600 line-clamp-2">The farm welcomes you for a cabbage sale from the 23rd of august 2026 til the 30th</p>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <button 
                    
                    className="rounded-lg bg-jkuat-green px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    { "View Details"}
                  </button>
                </div>
              </div>
            </div>

        </div>


<div className="relative flex py-5 items-center border-slate-200 ">
  <div className="flex-grow border-t border-gray-300"></div>
  <span className="flex-shrink mx-4 text-jkuat-red font-medium">All Notices</span>
  <div className="flex-grow border-t border-gray-300"></div>
</div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:m-4 '>

            <div className="bg-jkuat-white block max-w-sm  rounded-lg shadow  hover:shadow-2xl">
                <a href="#">
                    <img className="rounded" src={image} alt="" />
                </a>
                
                <div className="p-6 text-center">
                    <p className='text-sm text-jkuat-red text-center'>TUE 12 JUL 2026</p>
                    <span className="inline-flex items-center text-jkuat-green border border-brand-subtle text-fg-brand-strong text-xs font-medium px-1.5 py-0.5 rounded-sm">
                        <svg className="w-3 h-3 me-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.122 17.645a7.185 7.185 0 0 1-2.656 2.495 7.06 7.06 0 0 1-3.52.853 6.617 6.617 0 0 1-3.306-.718 6.73 6.73 0 0 1-2.54-2.266c-2.672-4.57.287-8.846.887-9.668A4.448 4.448 0 0 0 8.07 6.31 4.49 4.49 0 0 0 7.997 4c1.284.965 6.43 3.258 5.525 10.631 1.496-1.136 2.7-3.046 2.846-6.216 1.43 1.061 3.985 5.462 1.754 9.23Z"/></svg>
                        COHRED
                    </span>
                    <a href="#">
                        <h5 className="mt-3 mb-6 text-2xl text-jkuat-green font-semibold tracking-tight text-heading line-clamp-2">23rd annual General meeting at the COHRED hall</h5>
                    </a>
                    <a href="#" className="inline-flex  items-center text-white bg-jkuat-red box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">
                        Read more
                        <svg className="w-4 h-4 ms-1.5 rtl:rotate-180 -me-0.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5m14 0-4 4m4-4-4-4"/></svg>
                    </a>
                </div> 
            </div>


            

        </div>

        </>
    )
}