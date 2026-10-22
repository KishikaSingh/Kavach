export const Platform = { OS: 'android', select: (o) => o.android ?? o.default };
export const Linking = {
  openURL: async () => true,
  canOpenURL: async () => true,
};
