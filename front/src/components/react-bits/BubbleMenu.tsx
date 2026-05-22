import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

type MenuItem = {
  label: string;
  href: string;
  ariaLabel?: string;
  rotation?: number;
  hoverStyles?: {
    bgColor?: string;
    textColor?: string;
  };
};

export type BubbleMenuProps = {
  logo: ReactNode | string;
  onMenuClick?: (open: boolean) => void;
  className?: string;
  style?: CSSProperties;
  menuAriaLabel?: string;
  menuBg?: string;
  menuContentColor?: string;
  useFixedPosition?: boolean;
  items?: MenuItem[];
  animationEase?: string;
  animationDuration?: number;
  staggerDelay?: number;
};

const DEFAULT_ITEMS: MenuItem[] = [
  {
    label: 'home',
    href: '#',
    ariaLabel: 'Home',
    rotation: -8,
    hoverStyles: { bgColor: '#3b82f6', textColor: '#ffffff' }
  },
  {
    label: 'about',
    href: '#',
    ariaLabel: 'About',
    rotation: 8,
    hoverStyles: { bgColor: '#10b981', textColor: '#ffffff' }
  },
  {
    label: 'projects',
    href: '#',
    ariaLabel: 'Documentation',
    rotation: 8,
    hoverStyles: { bgColor: '#f59e0b', textColor: '#ffffff' }
  },
  {
    label: 'blog',
    href: '#',
    ariaLabel: 'Blog',
    rotation: 8,
    hoverStyles: { bgColor: '#ef4444', textColor: '#ffffff' }
  },
  {
    label: 'contact',
    href: '#',
    ariaLabel: 'Contact',
    rotation: -8,
    hoverStyles: { bgColor: '#8b5cf6', textColor: '#ffffff' }
  }
];

export default function BubbleMenu({
  logo,
  onMenuClick,
  className,
  style,
  menuAriaLabel = 'Toggle menu',
  menuBg = '#fff',
  menuContentColor = '#111',
  useFixedPosition = false,
  items,
  animationEase = 'back.out(1.5)',
  animationDuration = 0.5,
  staggerDelay = 0.12
}: BubbleMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const bubblesRef = useRef<HTMLAnchorElement[]>([]);
  const labelRefs = useRef<HTMLSpanElement[]>([]);

  const menuItems = items?.length ? items : DEFAULT_ITEMS;

  const containerClassName = [
    'bubble-menu',
    useFixedPosition ? 'fixed' : 'absolute',
    'left-0 right-0 top-8',
    'flex items-center justify-between',
    'gap-4 px-8',
    'pointer-events-none',
    'z-[1001]',
    className
  ]
    .filter(Boolean)
    .join(' ');

  const handleToggle = () => {
    const nextState = !isMenuOpen;
    if (nextState) setShowOverlay(true);
    setIsMenuOpen(nextState);
    onMenuClick?.(nextState);
  };

  useEffect(() => {
    const overlay = overlayRef.current;
    const bubbles = bubblesRef.current.filter(Boolean);
    const labels = labelRefs.current.filter(Boolean);
    if (!overlay || !bubbles.length) return;

    if (isMenuOpen) {
      gsap.set(overlay, { display: 'flex' });
      gsap.killTweensOf([...bubbles, ...labels]);
      gsap.set(bubbles, { scale: 0, transformOrigin: '50% 50%' });
      gsap.set(labels, { y: 24, autoAlpha: 0 });

      bubbles.forEach((bubble, i) => {
        const delay = i * staggerDelay + gsap.utils.random(-0.05, 0.05);
        const tl = gsap.timeline({ delay });
        tl.to(bubble, {
          scale: 1,
          duration: animationDuration,
          ease: animationEase
        });
        if (labels[i]) {
          tl.to(
            labels[i],
            {
              y: 0,
              autoAlpha: 1,
              duration: animationDuration,
              ease: 'power3.out'
            },
            '-=' + animationDuration * 0.9
          );
        }
      });
    } else if (showOverlay) {
      gsap.killTweensOf([...bubbles, ...labels]);
      gsap.to(labels, {
        y: 24,
        autoAlpha: 0,
        duration: 0.2,
        ease: 'power3.in'
      });
      gsap.to(bubbles, {
        scale: 0,
        duration: 0.2,
        ease: 'power3.in',
        onComplete: () => {
          gsap.set(overlay, { display: 'none' });
          setShowOverlay(false);
        }
      });
    }
  }, [isMenuOpen, showOverlay, animationEase, animationDuration, staggerDelay]);

  useEffect(() => {
    const handleResize = () => {
      if (isMenuOpen) {
        const bubbles = bubblesRef.current.filter(Boolean);
        const isDesktop = window.innerWidth >= 900;
        bubbles.forEach((bubble, i) => {
          const item = menuItems[i];
          if (bubble && item) {
            const rotation = isDesktop ? (item.rotation ?? 0) : 0;
            gsap.set(bubble, { rotation });
          }
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMenuOpen, menuItems]);

  return (
    <>
      <style>{`...`}</style>

      <nav className={containerClassName} style={style} aria-label="Main navigation">
        <div
          className={[
            'bubble logo-bubble',
            'inline-flex items-center justify-center',
            'rounded-full',
            'bg-white',
            'shadow-[0_4px_16px_rgba(0,0,0,0.12)]',
            'pointer-events-auto',
            'h-12 md:h-14',
            'px-4 md:px-8',
            'gap-2',
            'will-change-transform'
          ].join(' ')}
          aria-label="Logo"
          style={{
            background: menuBg,
            minHeight: '48px',
            borderRadius: '9999px'
          }}
        >
          <span className={[ 'logo-content', 'inline-flex items-center justify-center', 'w-[120px] h-full' ].join(' ')}>
            {typeof logo === 'string' ? (
              <img src={logo} alt="Logo" className="bubble-logo max-h-[60%] max-w-full object-contain block" />
            ) : (
              logo
            )}
          </span>
        </div>

        <button
          type="button"
          className={[
            'bubble toggle-bubble menu-btn',
            isMenuOpen ? 'open' : '',
            'inline-flex flex-col items-center justify-center',
            'rounded-full',
            'bg-white',
            'shadow-[0_4px_16px_rgba(0,0,0,0.12)]',
            'pointer-events-auto',
            'w-12 h-12 md:w-14 md:h-14',
            'border-0 cursor-pointer p-0',
            'will-change-transform'
          ].join(' ')}
          onClick={handleToggle}
          aria-label={menuAriaLabel}
          aria-pressed={isMenuOpen}
          style={{ background: menuBg }}
        >
          <span className="menu-line block mx-auto rounded-[2px]" style={{ width: 26, height: 2, background: menuContentColor, transform: isMenuOpen ? 'translateY(4px) rotate(45deg)' : 'none' }} />
          <span className="menu-line short block mx-auto rounded-[2px]" style={{ marginTop: '6px', width: 26, height: 2, background: menuContentColor, transform: isMenuOpen ? 'translateY(-4px) rotate(-45deg)' : 'none' }} />
        </button>
      </nav>

      {showOverlay && (
        <div ref={overlayRef} className={[ 'bubble-menu-items', useFixedPosition ? 'fixed' : 'absolute', 'inset-0', 'flex items-center justify-center', 'pointer-events-none', 'z-[1000]' ].join(' ')} aria-hidden={!isMenuOpen}>
          <ul className={[ 'pill-list', 'list-none m-0 px-6', 'w-full max-w-[1600px] mx-auto', 'flex flex-wrap', 'gap-x-0 gap-y-1', 'pointer-events-auto' ].join(' ')} role="menu" aria-label="Menu links">
            {menuItems.map((item, idx) => (
              <li key={idx} role="none" className={[ 'pill-col', 'flex justify-center items-stretch', '[flex:0_0_calc(100%/3)]', 'box-border' ].join(' ')}>
                <a role="menuitem" href={item.href} aria-label={item.ariaLabel || item.label} className={[ 'pill-link', 'w-full', 'rounded-[999px]', 'no-underline', 'bg-white', 'text-inherit', 'shadow-[0_4px_14px_rgba(0,0,0,0.10)]', 'flex items-center justify-center', 'relative', 'transition-[background,color] duration-300 ease-in-out', 'box-border', 'whitespace-nowrap overflow-hidden' ].join(' ')} style={{ ['--item-rot' as any]: `${item.rotation ?? 0}deg`, ['--pill-bg' as any]: menuBg, ['--pill-color' as any]: menuContentColor, ['--hover-bg' as any]: item.hoverStyles?.bgColor || '#f3f4f6', ['--hover-color' as any]: item.hoverStyles?.textColor || menuContentColor, background: 'var(--pill-bg)', color: 'var(--pill-color)', minHeight: 'var(--pill-min-h, 160px)', padding: 'clamp(1.5rem, 3vw, 8rem) 0', fontSize: 'clamp(1.5rem, 4vw, 4rem)', fontWeight: 400, lineHeight: 0, willChange: 'transform', height: 10 } as CSSProperties }>
                  <span ref={el => { /* noop for now */ }} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
