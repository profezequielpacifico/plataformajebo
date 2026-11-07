export { COLORS } from './colors.js';
export { SPACING } from './spacing.js';
export { TYPOGRAPHY } from './typography.js';
export { BREAKPOINTS } from './breakpoints.js';
export { SHADOWS } from './shadows.js';
export { RADIUS } from './radius.js';
export { TRANSITIONS } from './transitions.js';
export { Z_INDEX } from './zIndex.js';

import { COLORS } from './colors.js';
import { SPACING } from './spacing.js';
import { TYPOGRAPHY } from './typography.js';
import { BREAKPOINTS } from './breakpoints.js';
import { SHADOWS } from './shadows.js';
import { RADIUS } from './radius.js';
import { TRANSITIONS } from './transitions.js';
import { Z_INDEX } from './zIndex.js';

export const theme = {
    colors: COLORS,
    spacing: SPACING,
    typography: TYPOGRAPHY,
    breakpoints: BREAKPOINTS,
    shadows: SHADOWS,
    radius: RADIUS,
    transitions: TRANSITIONS,
    zIndex: Z_INDEX
};

const LOGIN_BACKGROUND_COLOR = '#074155';
const LOGIN_CORNER_SIZE = 'min(50vw, 88.889vh) auto';

const styles = {
    loginContainer: {
        height: '100vh',
        overflowY: 'auto',
        backgroundColor: LOGIN_BACKGROUND_COLOR,
        backgroundImage: [
            "url('/login-assets/bg-tl.svg')",
            "url('/login-assets/bg-tr.svg')",
            "url('/login-assets/bg-bl.svg')",
            "url('/login-assets/bg-br.svg')",
            `radial-gradient(ellipse at center, #0a4a60 0, ${LOGIN_BACKGROUND_COLOR} 55%, #053647 100%)`
        ].join(', '),
        backgroundSize: `${LOGIN_CORNER_SIZE}, ${LOGIN_CORNER_SIZE}, ${LOGIN_CORNER_SIZE}, ${LOGIN_CORNER_SIZE}, 100% 100%`,
        backgroundPosition: 'top left, top right, bottom left, bottom right, center',
        backgroundRepeat: 'no-repeat',
        padding: 0,
        boxSizing: 'border-box'
    },
    loginArea: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        padding: SPACING.lg,
        boxSizing: 'border-box'
    },
    loginColumn: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        width: '100%',
        maxWidth: '400px'
    },
    loginMascot: {
        position: 'absolute',
        right: 'calc(100% - 16px)',
        bottom: '-6px',
        height: '340px',
        width: 'auto'
    },
    loginInfo: {
        width: 'calc(100% - clamp(32px, 7vw, 96px))',
        maxWidth: '1200px',
        margin: '80px auto 48px auto',
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(4px)',
        borderRadius: RADIUS.lg,
        boxShadow: SHADOWS.md,
        padding: `${SPACING.xl} ${SPACING['2xl']}`
    },
    loginInfoLogo: {
        fontSize: TYPOGRAPHY.sizes['2xl'],
        fontWeight: TYPOGRAPHY.weights.bold,
        color: COLORS.primary,
        marginBottom: SPACING.xs
    },
    loginInfoSubtitle: {
        fontSize: TYPOGRAPHY.sizes.sm,
        color: COLORS.textMuted,
        marginBottom: SPACING.lg
    },
    loginInfoSectionTitle: {
        fontSize: TYPOGRAPHY.sizes.lg,
        fontWeight: TYPOGRAPHY.weights.semibold,
        color: COLORS.text,
        margin: `0 0 ${SPACING.sm} 0`
    },
    loginInfoText: {
        fontSize: TYPOGRAPHY.sizes.base,
        color: COLORS.text,
        lineHeight: TYPOGRAPHY.heights.relaxed,
        margin: `0 0 ${SPACING.md} 0`
    },
    loginInfoDivider: {
        border: 'none',
        borderTop: `1px solid ${COLORS.border}`,
        margin: `${SPACING.md} 0`
    },
    developerList: {
        listStyle: 'none',
        padding: 0,
        margin: 0
    },
    developerItem: {
        display: 'flex',
        flexDirection: 'column',
        marginBottom: SPACING.sm,
        fontSize: TYPOGRAPHY.sizes.sm
    },
    developerName: {
        fontWeight: TYPOGRAPHY.weights.semibold,
        color: COLORS.text
    },
    developerRole: {
        color: COLORS.textMuted
    },
    loginBox: {
        position: 'relative',
        backgroundColor: COLORS.surface,
        padding: SPACING.xl,
        borderRadius: RADIUS.lg,
        boxShadow: SHADOWS.md,
        width: '100%',
        maxWidth: '400px'
    },
    loginLogo: {
        textAlign: 'center',
        marginBottom: SPACING.xl
    },
    loginLogoImage: {
        display: 'block',
        width: '216px',
        maxWidth: '100%',
        height: 'auto',
        margin: `0 auto ${SPACING.sm}`
    },
    loginLogoText: {
        fontSize: TYPOGRAPHY.sizes.xl,
        fontWeight: TYPOGRAPHY.weights.bold,
        color: COLORS.primary
    },
    formGroup: {
        marginBottom: SPACING.md
    },
    formLabel: {
        display: 'block',
        marginBottom: SPACING.xs,
        fontSize: TYPOGRAPHY.sizes.sm,
        fontWeight: TYPOGRAPHY.weights.medium,
        color: COLORS.text
    },
    formInput: {
        width: '100%',
        padding: SPACING.sm,
        border: `1px solid ${COLORS.border}`,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.surface,
        color: COLORS.text,
        minHeight: '44px',
        fontSize: '16px'
    },
    formSelect: {
        width: '100%',
        padding: SPACING.sm,
        border: `1px solid ${COLORS.border}`,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.surface,
        color: COLORS.text,
        minHeight: '44px',
        fontSize: '16px'
    },
    loginButton: {
        width: '100%',
        padding: SPACING.sm,
        backgroundColor: COLORS.primary,
        color: COLORS.white,
        border: 'none',
        borderRadius: RADIUS.md,
        fontSize: TYPOGRAPHY.sizes.base,
        fontWeight: TYPOGRAPHY.weights.medium,
        cursor: 'pointer',
        transition: TRANSITIONS.default
    },
    loginLinks: {
        marginTop: SPACING.md,
        textAlign: 'center'
    },
    loginLink: {
        color: COLORS.primary,
        textDecoration: 'none',
        fontSize: TYPOGRAPHY.sizes.sm
    },

    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: COLORS.background
    },
    loadingText: {
        color: COLORS.text,
        fontSize: TYPOGRAPHY.sizes.base
    },

    successContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: COLORS.background,
        padding: SPACING.lg,
        textAlign: 'center'
    },
    successTitle: {
        fontSize: TYPOGRAPHY.sizes.xl,
        fontWeight: TYPOGRAPHY.weights.bold,
        color: COLORS.success,
        marginBottom: SPACING.sm
    },
    successText: {
        fontSize: TYPOGRAPHY.sizes.base,
        color: COLORS.text,
        marginBottom: SPACING.xl
    },
    successButton: {
        padding: `${SPACING.sm} ${SPACING.lg}`,
        backgroundColor: COLORS.primary,
        color: COLORS.white,
        border: 'none',
        borderRadius: RADIUS.md,
        fontSize: TYPOGRAPHY.sizes.base,
        fontWeight: TYPOGRAPHY.weights.medium,
        cursor: 'pointer'
    },

    buttonPrimary: {
        padding: '12px 20px',
        backgroundColor: COLORS.primary,
        color: COLORS.white,
        border: 'none',
        borderRadius: RADIUS.md,
        fontSize: TYPOGRAPHY.sizes.base,
        fontWeight: TYPOGRAPHY.weights.medium,
        cursor: 'pointer',
        transition: TRANSITIONS.default,
        minHeight: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
    },
    buttonOutline: {
        padding: '12px 20px',
        backgroundColor: 'transparent',
        color: COLORS.primary,
        border: `1px solid ${COLORS.primary}`,
        borderRadius: RADIUS.md,
        fontSize: TYPOGRAPHY.sizes.base,
        fontWeight: TYPOGRAPHY.weights.medium,
        cursor: 'pointer',
        transition: TRANSITIONS.default,
        minHeight: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
    },
    buttonSuccess: {
        padding: `${SPACING.sm} ${SPACING.md}`,
        backgroundColor: COLORS.success,
        color: COLORS.white,
        border: 'none',
        borderRadius: RADIUS.md,
        fontSize: TYPOGRAPHY.sizes.base,
        fontWeight: TYPOGRAPHY.weights.medium,
        cursor: 'pointer',
        transition: TRANSITIONS.default
    },
    buttonDanger: {
        padding: `${SPACING.sm} ${SPACING.md}`,
        backgroundColor: COLORS.danger,
        color: COLORS.white,
        border: 'none',
        borderRadius: RADIUS.md,
        fontSize: TYPOGRAPHY.sizes.base,
        fontWeight: TYPOGRAPHY.weights.medium,
        cursor: 'pointer',
        transition: TRANSITIONS.default
    },
    buttonInfo: {
        padding: `${SPACING.sm} ${SPACING.md}`,
        backgroundColor: '#3b82f6',
        color: COLORS.white,
        border: 'none',
        borderRadius: RADIUS.md,
        fontSize: TYPOGRAPHY.sizes.base,
        fontWeight: TYPOGRAPHY.weights.medium,
        cursor: 'pointer',
        transition: TRANSITIONS.default
    },

    appContainer: {
        minHeight: '100vh',
        backgroundColor: COLORS.background
    },
    layout: {
        display: 'flex',
        minHeight: '100vh'
    },
    sidebar: {
        width: '250px',
        backgroundColor: COLORS.surface,
        borderRight: `1px solid ${COLORS.border}`,
        padding: SPACING.lg
    },
    sidebarLogo: {
        fontSize: TYPOGRAPHY.sizes.xl,
        fontWeight: TYPOGRAPHY.weights.bold,
        color: COLORS.primary,
        marginBottom: SPACING.xs
    },
    sidebarAdmin: {
        fontSize: TYPOGRAPHY.sizes.sm,
        color: COLORS.textMuted,
        marginBottom: SPACING.xl
    },

    table: {
        width: '100%',
        borderCollapse: 'collapse',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.md,
        overflow: 'hidden',
        boxShadow: SHADOWS.sm,
        fontSize: '14px',
    },
    tableHeader: {
        backgroundColor: COLORS.background
    },
    tableHeaderCell: {
        padding: SPACING.sm,
        textAlign: 'left',
        fontWeight: TYPOGRAPHY.weights.medium,
        color: COLORS.text,
        borderBottom: `1px solid ${COLORS.border}`,
        whiteSpace: 'nowrap',
    },
    tableRow: {
        borderBottom: `1px solid ${COLORS.border}`
    },
    tableCell: {
        padding: SPACING.sm,
        color: COLORS.text,
    },
    tableActions: {
        display: 'flex',
        gap: SPACING.xs
    },

    card: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        boxShadow: SHADOWS.sm,
        overflow: 'hidden',
        margin: '0 0 20px 0',
    },
    cardHeader: {
        padding: SPACING.lg,
        borderBottom: `1px solid ${COLORS.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: SPACING.md,
    },
    cardHeaderActions: {
        flex: '0 1 auto',
        minWidth: 0,
        maxWidth: '100%',
    },
    cardTitle: {
        fontSize: TYPOGRAPHY.sizes.lg,
        fontWeight: TYPOGRAPHY.weights.semibold,
        color: COLORS.text,
        margin: 0
    },

    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: Z_INDEX.modal
    },
    modal: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.xl,
        maxWidth: '500px',
        width: '90%',
        boxShadow: SHADOWS.lg
    },
    modalTitle: {
        fontSize: TYPOGRAPHY.sizes.lg,
        fontWeight: TYPOGRAPHY.weights.semibold,
        color: COLORS.text,
        margin: `0 0 ${SPACING.md} 0`
    },
    modalText: {
        color: COLORS.text,
        marginBottom: SPACING.lg
    },
    modalButtons: {
        display: 'flex',
        gap: SPACING.sm,
        justifyContent: 'flex-end'
    },

    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: SPACING.lg,
        marginBottom: SPACING.xl
    },
    statCard: {
        backgroundColor: COLORS.surface,
        padding: SPACING.lg,
        borderRadius: RADIUS.lg,
        boxShadow: SHADOWS.sm
    },
    statLabel: {
        fontSize: TYPOGRAPHY.sizes.sm,
        color: COLORS.textMuted,
        marginBottom: SPACING.xs
    },
    statValue: {
        fontSize: TYPOGRAPHY.sizes.xl,
        fontWeight: TYPOGRAPHY.weights.bold,
        color: COLORS.primary
    },

    badge: {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: RADIUS.sm,
        fontSize: TYPOGRAPHY.sizes.xs,
        fontWeight: TYPOGRAPHY.weights.medium,
        textTransform: 'uppercase'
    },
    badgeGreen: {
        backgroundColor: '#22c55e',
        color: 'white'
    },
    badgeYellow: {
        backgroundColor: '#f59e0b',
        color: 'white'
    },
    badgeRed: {
        backgroundColor: '#f44336',
        color: 'white'
    },
    badgeBlue: {
        backgroundColor: '#2196f3',
        color: 'white'
    },
    badgeOrange: {
        backgroundColor: '#ff9800',
        color: 'white'
    },

    savingBox: {
        backgroundColor: COLORS.saving,
        color: '#1e293b',
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.sm,
        fontSize: TYPOGRAPHY.sizes.base,
        fontWeight: TYPOGRAPHY.weights.medium
    },

    errorBoxLight: {
        backgroundColor: COLORS.dangerLight,
        color: '#1e293b',
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        fontSize: TYPOGRAPHY.sizes.sm
    },

    errorBoxDark: {
        backgroundColor: COLORS.danger,
        color: COLORS.white,
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        fontSize: TYPOGRAPHY.sizes.sm,
        fontWeight: TYPOGRAPHY.weights.medium
    },

    tournamentContainer: {
    maxWidth: '1600px',
    margin: '0 auto',
    padding: SPACING.lg
},

tournamentHeader: {
    marginBottom: SPACING.xl
},

tournamentTitle: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
    margin: '0 0 8px 0'
},

tournamentSubtitle: {
    margin: 0,
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textMuted
},

tournamentLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 360px',
    gap: SPACING.xl
},

tournamentForm: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    border: `1px solid ${COLORS.border}`,
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.xl
},

sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.lg
},

twoColumnGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: SPACING.lg
},

twoColumnGridWithMargin: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: SPACING.lg,
    marginTop: SPACING.md
},

threeColumnGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: SPACING.sm
},

formTextarea: {
    height: '82px',
    resize: 'vertical'
},

formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: SPACING.md,
    marginTop: SPACING.lg
},

sidebarContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.lg
},

summaryCard: {
    backgroundColor: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl
},

summaryTitle: {
    marginBottom: SPACING.md,
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text
},

summaryContent: {
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: '1.6',
    color: COLORS.text
},

summaryImportantText: {
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.text,
    marginBottom: SPACING.sm
},

documentIcon: {
    fontSize: '26px',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: '4px 8px',
    lineHeight: 1
},

regulationContainer: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
},

stepperContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 0 32px',
    gap: '0'
},

stepperStep: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
},

stepperCircle: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '700',
    flexShrink: 0,
    transition: 'all 0.3s ease'
},

stepperLabel: {
    fontSize: '13px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    transition: 'color 0.3s ease'
},

stepperLine: {
    width: '60px',
    height: '2px',
    margin: '0 8px',
    transition: 'background-color 0.3s ease',
    flexShrink: 0
},

wizardActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: '1px solid #e5e7eb'
},

wizardActionsRight: {
    display: 'flex',
    gap: '12px'
},

confirmSummary: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    marginTop: '8px'
},

confirmRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '14px'
},

confirmLabel: {
    color: '#6b7280',
    fontWeight: '500'
},

confirmValue: {
    color: '#111827',
    fontWeight: '600',
    textAlign: 'right'
}
};

export { styles };
export default theme;
