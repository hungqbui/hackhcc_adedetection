declare module 'motion/react' {
  import React from 'react';
  
  export const motion: any;
  export function useMotionValue(initialValue: any): any;
  export function useSpring(source: any, config?: any): any;
  export function useInView(ref: React.RefObject<any>, options?: any): boolean;
  export type SpringOptions = any;
}
