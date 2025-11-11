import React from 'react';
import Head from 'next/head';

interface SEOProps {
  title: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

const SEO: React.FC<SEOProps> = ({
  title,
  description,
  ogTitle,
  ogDescription,
  ogImage,
}) => (
  <Head>
    <title>{title}</title>
    {description && <meta name="description" content={description} />}
    {ogTitle && <meta property="og:title" content={ogTitle} />}
    {ogDescription && <meta property="og:description" content={ogDescription} />}
    {ogImage && <meta property="og:image" content={ogImage} />}
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta charSet="utf-8" />
  </Head>
);

export default SEO;
