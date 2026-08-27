/**
 * i18n bootstrap. Side-effect import from `app/root.tsx` calls
 * `initI18n('en')` on the first render so the i18next singleton
 * is wired before any component reads `t(...)`.
 */

import { initI18n } from '~/shared/i18n';

initI18n();
