import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import InteractiveGrass from './InteractiveGrass'

export default function Layout() {
  return (
    <>
      <InteractiveGrass />
      <div className="min-h-screen flex flex-col bg-transparent text-white selection:bg-[var(--color-electric-blue)] selection:text-white relative z-10">
        <Navbar />
        <main className="flex-1 flex flex-col relative z-10">
          <Outlet />
        </main>
      </div>
    </>
  )
}
