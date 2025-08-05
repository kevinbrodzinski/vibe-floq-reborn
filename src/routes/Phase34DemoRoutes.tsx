import { lazy } from 'react';

const Phase34Demo = lazy(() => import('@/components/demo/Phase34Demo'));

export default function Phase34DemoRoutes() {
  return <Phase34Demo />;
}