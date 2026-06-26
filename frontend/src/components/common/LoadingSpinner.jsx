import React from "react";
import { Loader, Text, Center, Stack } from "@mantine/core";

/**
 * LoadingSpinner - A reusable, clean loading overlay/spinner component.
 * Uses Mantine's Loader and coordinates with the project's visual style.
 */
export default function LoadingSpinner({
  size = "md",
  color = "blue",
  label = "Cargando...",
  minHeight = "200px",
}) {
  return (
    <Center style={{ minHeight, width: "100%" }}>
      <Stack align="center" gap="sm">
        <Loader size={size} color={color} variant="dots" />
        {label && (
          <Text size="sm" color="dimmed" fw={500}>
            {label}
          </Text>
        )}
      </Stack>
    </Center>
  );
}
