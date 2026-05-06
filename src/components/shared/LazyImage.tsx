"use client";

import { useEffect, useRef, type ImgHTMLAttributes } from "react";

type LazyImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "decoding" | "loading" | "src"> & {
  src?: string;
  eager?: boolean;
};

const transparentPixel =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

export function LazyImage({ alt = "", eager = false, src, ...props }: LazyImageProps) {
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) {
      return;
    }

    if (!src) {
      image.src = transparentPixel;
      image.removeAttribute("data-src");
      image.removeAttribute("data-loading");
      return;
    }

    const startLoadingImage = () => {
      let settled = false;

      const finishLoading = () => {
        if (settled) {
          return;
        }

        settled = true;
        image.removeAttribute("data-loading");
        image.removeEventListener("load", finishLoading);
        image.removeEventListener("error", finishLoading);
      };

      image.dataset.loading = "true";
      image.addEventListener("load", finishLoading);
      image.addEventListener("error", finishLoading);
      image.src = src;
      image.removeAttribute("data-src");

      if (image.complete) {
        finishLoading();
      }

      return finishLoading;
    };

    if (eager) {
      return startLoadingImage();
    }

    if (!("IntersectionObserver" in window)) {
      return startLoadingImage();
    }

    image.src = transparentPixel;
    image.dataset.loading = "true";

    const activateImage = () => {
      return startLoadingImage();
    };

    const rect = image.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const preloadDistance = 360;
    const nearViewport =
      rect.bottom >= -preloadDistance &&
      rect.right >= -preloadDistance &&
      rect.top <= viewportHeight + preloadDistance &&
      rect.left <= viewportWidth + preloadDistance;

    if (nearViewport) {
      return activateImage();
    }

    let finishLoading: (() => void) | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          finishLoading = activateImage();
          observer.disconnect();
        }
      },
      {
        rootMargin: "360px",
      },
    );

    observer.observe(image);

    return () => {
      observer.disconnect();
      finishLoading?.();
    };
  }, [eager, src]);

  return (
    // Keep offscreen R2 URLs out of src until the image is close to the viewport.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imageRef}
      {...props}
      alt={alt}
      src={eager ? src : transparentPixel}
      data-src={eager ? undefined : src}
      data-loading={eager || !src ? undefined : "true"}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={eager ? "high" : "low"}
    />
  );
}
