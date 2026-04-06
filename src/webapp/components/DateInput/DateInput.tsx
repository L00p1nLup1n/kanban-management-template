import { Input, InputProps, useColorModeValue } from '@chakra-ui/react';

export default function DateInput(props: Omit<InputProps, 'type'>) {
  const scheme = useColorModeValue('light', 'dark');

  return (
    <Input
      type="date"
      sx={{
        colorScheme: scheme,
        '::-webkit-calendar-picker-indicator': {
          filter: scheme === 'dark' ? 'invert(1) brightness(0.8)' : 'none',
          cursor: 'pointer',
          opacity: 0.7,
          _hover: { opacity: 1 },
        },
      }}
      {...props}
    />
  );
}
