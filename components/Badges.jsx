import { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHOD } from '@/lib/constants';

const base = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold';
export const StatusBadge = ({ status }) => <span className={`${base} ${ORDER_STATUS[status]?.color || ''}`}>{ORDER_STATUS[status]?.label || status}</span>;
export const PayBadge = ({ status }) => <span className={`${base} ${PAYMENT_STATUS[status]?.color || ''}`}>{PAYMENT_STATUS[status]?.label || status}</span>;
export const MethodBadge = ({ method }) => <span className={`${base} bg-espresso text-gold`}>{PAYMENT_METHOD[method] || method}</span>;
