import { FaqSection as SharedFaqSection } from '../organizers/FaqSection';
import { ADS_SIGNUP_URL } from '../../constants';

export function FaqSection() {
  return <SharedFaqSection namespace="advertisersPage" helpHref={ADS_SIGNUP_URL} />;
}
