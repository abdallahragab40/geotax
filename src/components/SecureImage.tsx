// صورة من مساحة التخزين الخاصة: تحوّل الرابط المحفوظ إلى رابط موقّع مؤقت قبل العرض
import React, { useEffect, useState } from "react";
import { Image, ImageProps, View } from "react-native";
import { resolvePhotoUrl } from "../data/storage";

export default function SecureImage({ uri, style, ...rest }: Omit<ImageProps, "source"> & { uri: string }) {
  const [resolved, setResolved] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    resolvePhotoUrl(uri).then((u) => { if (alive) setResolved(u); });
    return () => { alive = false; };
  }, [uri]);

  if (!resolved) return <View style={style} />;
  return <Image {...rest} style={style} source={{ uri: resolved }} />;
}
