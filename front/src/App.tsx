import React from 'react'
import SplashCursor from './components/SplashCursor'
import AnimatedContent from './components/AnimatedContent'
import StarBorder from './components/StarBorder'
import ElectricBorder from './components/ElectricBorder'

function App() {
  return (
    <div className="relative min-h-screen bg-slate-950 text-white overflow-hidden flex flex-col font-sans">
      <SplashCursor />
      
      <main className="flex-1 flex flex-col items-center justify-center p-8 z-10 relative">
        <AnimatedContent
          distance={150}
          direction="vertical"
          reverse={false}
          ease="elastic.out(1, 0.5)"
          duration={1.5}
          initialOpacity={0.2}
          animateOpacity
          scale={0.9}
        >
          <div className="text-center mb-12 flex flex-col items-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
              Welcome to the Future
            </h1>
            <p className="text-xl md:text-2xl text-slate-400 max-w-2xl text-center">
              We are building the next generation of interactive web experiences. 
              Powered by generic interactive components and React Bits.
            </p>
          </div>
        </AnimatedContent>

        <AnimatedContent delay={0.5} distance={100} direction="vertical">
          <div className="flex flex-col sm:flex-row gap-6 items-center">
            <StarBorder as="button" color="cyan" speed="4s" className="px-8 py-4 text-lg font-semibold bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors">
              Get Started
            </StarBorder>
            
            <ElectricBorder>
              <button className="px-8 py-4 text-lg font-semibold bg-indigo-950/50 rounded-lg hover:bg-indigo-900/50 transition-colors text-indigo-300">
                View Documentation
              </button>
            </ElectricBorder>
          </div>
        </AnimatedContent>
        
        <AnimatedContent delay={1} distance={50} direction="vertical">
             <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl">
                {[1, 2, 3].map((item) => (
                    <div key={item} className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                        <h3 className="text-xl font-semibold mb-3 text-purple-300">Feature {item}</h3>
                        <p className="text-slate-400">Discover amazing capabilities built right into the platform. Interactive, fast, and beautiful.</p>
                    </div>
                ))}
             </div>
        </AnimatedContent>

      </main>
    </div>
  )
}

export default App
