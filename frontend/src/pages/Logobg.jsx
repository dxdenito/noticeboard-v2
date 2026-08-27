import React from 'react';

export default function FixedLogoBackground() {
  return (
    <div className="relative w-full min-h-screen bg-slate-50">
      
      {/* 1. The Fixed Faded Logo Layer */}
      <div 
        className="fixed inset-0 pointer-events-none z-0
                   bg-[url('./images/jkuatlogo.png')] bg-no-repeat bg-center 
                   bg-[length:70vmin] opacity-[0.05]" 
      />

      {/* 2. Your Scrollable Website Content */}
      <main className="relative z-10 mx-auto max-w-4xl px-6 py-24 space-y-20">
        <section className="text-center h-[60vh] flex flex-col justify-center">
          <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Main Website Headline
          </h1>
          <p className="text-xl text-slate-600 max-w-xl mx-auto">
            Scroll down to see the watermark logo stay completely locked in the center of the screen.
          </p>
        </section>

        {/* Dummy content sections to make the page long enough to scroll */}
        <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 h-96">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Section One</h2>
          <p className="text-slate-600">The logo stays floating right behind this card as you scroll.</p>
        </section>

        <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 h-96">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Section Two</h2>
          <p className="text-slate-600">The text passes smoothly over it with total readability.</p>
        </section>
      </main>
    </div>
  );
}
