import { useSearchParams } from 'react-router-dom';
import { getTodayString } from '@/utils/date';
import { AfterglowScreen } from '@/components/screens/AfterglowScreen';

export default function AfterglowRoutes() {
  const [params] = useSearchParams();
  const date = params.get('date') ?? getTodayString();
  
  // Pass date as prop to AfterglowScreen
  return <AfterglowScreen date={date} />;
}