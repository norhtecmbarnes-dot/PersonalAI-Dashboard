import { SpaceInvaders } from '@/components/SpaceInvaders';

export const metadata = {
  title: 'Neon Invaders',
  description: 'A neon-themed Space Invaders game with scoring.',
};

export default function SpaceInvadersPage() {
  return (
    <div className="min-h-screen bg-[#05010f] bg-[radial-gradient(ellipse_at_top,rgba(80,30,160,0.25),transparent_60%)]">
      <div className="max-w-4xl mx-auto px-4 pt-8 pb-4">
        <SpaceInvaders />
      </div>
    </div>
  );
}
