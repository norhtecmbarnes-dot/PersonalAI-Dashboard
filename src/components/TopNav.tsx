'use client';

import Link from 'next/link';

export function TopNav() {
  return (
    <nav className="bg-slate-800/80 backdrop-blur border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Link 
              href="/" 
              className="flex items-center gap-2 text-white hover:text-purple-400 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="font-semibold">Home</span>
            </Link>
          </div>
          
           <div className="flex items-center gap-1 overflow-x-auto">
             <NavLink href="/calendar">Calendar</NavLink>
             <NavLink href="/tasks">Tasks</NavLink>
             <NavLink href="/notes">Notes</NavLink>
             <NavLink href="/writing/workspace">Writing</NavLink>
             <NavLink href="/editor">Editor</NavLink>
             <NavLink href="/office">Office</NavLink>
             <NavLink href="/database/forms">Forms</NavLink>
              <NavLink href="/brand-workspace">Brands</NavLink>
              <NavLink href="/bid-workflow">Bid Workflow</NavLink>
             <NavLink href="/memory">Memory</NavLink>
             <NavLink href="/canvas">Canvas</NavLink>
             <NavLink href="/system">System</NavLink>
             <NavLink href="/security">Security</NavLink>
             <NavLink href="/telegram">Telegram</NavLink>
            <NavLink href="/settings">
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link 
      href={href}
      className="px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap"
    >
      {children}
    </Link>
  );
}
