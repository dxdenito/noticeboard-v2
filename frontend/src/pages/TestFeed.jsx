import React, { useRef } from 'react';

export default function AsymmetricNoticeboard() {
  const urgentScrollRef = useRef(null);

  // Mock data tailored to your layout blueprint
  const urgentNotices = [
    { id: 1, day: "12", month: "JUL", year: "2026", title: "Emergency Main Server Migration Overtime Operations", dept: "IT DEPT", img: "https://unsplash.com" },
    { id: 2, day: "15", month: "JUL", year: "2026", title: "New Compliance Safety Regulation Updates", dept: "HR DEPT", img: "https://unsplash.com" },
    { id: 3, day: "18", month: "JUL", year: "2026", title: "Q3 Strategy Board Meeting Relocation Details", dept: "EXEC", img: "https://unsplash.com" }
  ];

  const todayNotices = [
    { id: 1, date: "12 JULY 2026", dept: "OPERATIONS", title: "Logistics Optimization Strategy Launch", img: "https://unsplash.com" },
    { id: 2, date: "12 JULY 2026", dept: "FACILITIES", title: "Alternative Electric Grid Tests in Progress", img: "https://unsplash.com" },
    { id: 3, date: "12 JULY 2026", dept: "MARKETING", title: "Brand Identity Guideline Overhaul Launch", img: "https://unsplash.com" }
  ];

  return (
    <div className="w-full min-h-screen bg-white text-gray-900 font-sans p-4 md:p-8 select-none">
      <div className="max-w-6xl mx-auto space-y-16">
        
        {/* ========================================================================= */}
        {/* 1. URGENT / PINNED NOTICES (Asymmetric Slider)                             */}
        {/* ========================================================================= */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-6 bg-red-600 rounded-sm transform skew-x-12 inline-block"></span>
            <h2 className="text-base font-extrabold tracking-wider text-red-600 uppercase">
              Urgent / Pinned Notices
            </h2>
          </div>

          {/* Horizontal scroll lane */}
          <div 
            ref={urgentScrollRef}
            className="flex gap-6 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory scrollbar-none"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style>{`div::-webkit-scrollbar { display: none; }`}</style>
            
            {urgentNotices.map((notice) => (
              <div 
                key={notice.id}
                className="flex-none w-[350px] md:w-[430px] h-44 bg-white border border-gray-200 flex items-stretch snap-start shadow-md hover:shadow-lg transition-shadow relative overflow-hidden rounded-r-lg"
              >
                {/* Asymmetric Date Strip using Navbar Clip-Path Concept */}
                <div 
                  className="w-16 bg-red-600 text-white flex flex-col items-center justify-center font-sans font-black py-4 leading-none relative z-10 pl-2 pr-4 shrink-0"
                  style={{ clipPath: 'polygon(0 0, 100% 0, 75% 100%, 0 100%)' }}
                >
                  <span className="text-xl tracking-tight">{notice.day}</span>
                  <span className="text-[10px] tracking-widest uppercase my-1 font-bold">{notice.month}</span>
                  <span className="text-[9px] opacity-80 tracking-wider mt-1">{notice.year}</span>
                </div>

                {/* Content Block */}
                <div className="flex-1 flex p-4 gap-4 items-center min-w-0 -ml-2">
                  {/* Image Frame with complementary diagonal hover clip cut option */}
                  <img 
                    src={notice.img} 
                    alt="Notice thumbnail"
                    className="w-24 h-full object-cover rounded bg-gray-50 border border-gray-100 shrink-0" 
                  />
                  
                  {/* Meta Stack */}
                  <div className="flex-1 flex flex-col justify-between h-full min-w-0">
                    <div>
                      <span className="inline-block text-red-600 text-[10px] font-extrabold tracking-wider uppercase bg-red-50 px-2 py-0.5 rounded mb-1.5">
                        {notice.dept}
                      </span>
                      <h3 className="font-extrabold text-sm text-gray-900 leading-snug line-clamp-2 hover:text-red-600 cursor-pointer transition-colors">
                        {notice.title}
                      </h3>
                    </div>

                    <div className="flex justify-end">
                      <button className="bg-red-600 hover:bg-red-700 text-white text-[11px] font-extrabold px-4 py-2 rounded transition-colors shadow-sm cursor-pointer">
                        Read More
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. ALL NOTICES (Asymmetric Grid Structure)                                */}
        {/* ========================================================================= */}
        <section className="space-y-12">
          
          {/* Today Timeline Split */}
          <div className="space-y-8">
            <div className="text-center relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
              <span className="relative bg-white px-6 text-xs font-black tracking-widest text-green-600 uppercase">
                // Today
              </span>
            </div>

            {/* Grid Container */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {todayNotices.map((notice) => (
                <article 
                  key={notice.id}
                  className="bg-white border border-gray-200 flex flex-col shadow-sm hover:shadow-xl transition-all rounded-xl overflow-hidden group"
                >
                  {/* Top Image Frame with Angular Divider Overlay */}
                  <div className="w-full h-48 bg-gray-100 relative overflow-hidden shrink-0">
                    <img 
                      src={notice.img} 
                      alt="Notice graphics content" 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Skewed Bottom Branding Slice Trim */}
                    <div 
                      className="absolute bottom-0 left-0 w-2/3 h-6 bg-green-600 pointer-events-none"
                      style={{ clipPath: 'polygon(0 80%, 100% 100%, 0 100%)' }}
                    />
                  </div>

                  {/* Text Information Payload Container */}
                  <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-gray-400">
                        <span>{notice.date}</span>
                      </div>
                      
                      <span className="inline-block bg-green-50 text-green-700 border border-green-200 text-[10px] font-black tracking-wider px-2.5 py-0.5 rounded uppercase">
                        {notice.dept}
                      </span>
                      
                      <h3 className="font-extrabold text-base text-gray-900 leading-tight tracking-tight group-hover:text-green-600 transition-colors cursor-pointer pt-1 line-clamp-2">
                        {notice.title}
                      </h3>
                    </div>

                    <div className="pt-2">
                      <button className="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-extrabold py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer">
                        READ MORE
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* Yesterday Timeline Split */}
          <div className="space-y-4 pt-4">
            <div className="text-center relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
              <span className="relative bg-white px-6 text-xs font-bold tracking-widest text-gray-300 uppercase">
                // Yesterday
              </span>
            </div>
            <p className="text-center text-xs font-medium text-gray-400 italic">No historical updates recorded for yesterday.</p>
          </div>

        </section>

      </div>
    </div>
  );
}
