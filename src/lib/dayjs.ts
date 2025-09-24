import dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend((utc as any).default || (utc as any));
dayjs.extend((relativeTime as any).default || (relativeTime as any));

export default dayjs; 