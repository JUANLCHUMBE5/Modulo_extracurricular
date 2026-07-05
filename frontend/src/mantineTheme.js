import { createTheme } from "@mantine/core";

export const mantineTheme = createTheme({
  primaryColor: "sanrafael",
  fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  headings: {
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontWeight: "800",
  },
  colors: {
    sanrafael: [
      "#e8f7f2", // matches --ui-primary-soft
      "#d6f7ec",
      "#aeeedc",
      "#80dfc6",
      "#55ccb0",
      "#2fb89b",
      "#23977f", // matches --ui-primary
      "#176c60", // matches --ui-primary-dark
      "#13544a",
      "#0c352f",
    ],
  },
  defaultRadius: "md",
  components: {
    Button: {
      defaultProps: {
        radius: "md",
      },
    },
    TextInput: {
      defaultProps: {
        radius: "md",
      },
    },
    Select: {
      defaultProps: {
        radius: "md",
      },
    },
    Modal: {
      defaultProps: {
        radius: "md",
        centered: true,
        overlayProps: { blur: 2 },
      },
    },
    Notification: {
      defaultProps: {
        radius: "md",
      },
    },
  },
});
