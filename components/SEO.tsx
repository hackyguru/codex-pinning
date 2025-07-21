import Head from 'next/head';
import { useRouter } from 'next/router';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  article?: boolean;
  noindex?: boolean;
  canonical?: string;
}

const defaultMeta = {
  title: 'ThirdStorage - Decentralized Storage on Codex Network',
  description: 'Store your files on the decentralized Codex network with ThirdStorage. Secure, reliable, and censorship-resistant storage for the future.',
  keywords: 'decentralized storage, blockchain storage, IPFS alternative, Codex network, web3 storage, file hosting, distributed storage',
  image: '/og-image.png',
  type: 'website',
  siteName: 'ThirdStorage'
};

export default function SEO({
  title,
  description,
  keywords,
  image,
  article = false,
  noindex = false,
  canonical
}: SEOProps) {
  const router = useRouter();
  
  const seo = {
    title: title ? `${title} | ThirdStorage` : defaultMeta.title,
    description: description || defaultMeta.description,
    keywords: keywords || defaultMeta.keywords,
    image: image || defaultMeta.image,
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://thirdstorage.com'}${router.asPath}`,
    canonical: canonical || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://thirdstorage.com'}${router.asPath}`
  };

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <meta name="keywords" content={seo.keywords} />
      <meta name="author" content="ThirdStorage" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta charSet="utf-8" />

      {/* Canonical URL */}
      <link rel="canonical" href={seo.canonical} />

      {/* Robots */}
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      {!noindex && <meta name="robots" content="index,follow" />}

      {/* Open Graph */}
      <meta property="og:type" content={article ? 'article' : 'website'} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:image" content={seo.image} />
      <meta property="og:url" content={seo.url} />
      <meta property="og:site_name" content={defaultMeta.siteName} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      <meta name="twitter:image" content={seo.image} />
      <meta name="twitter:site" content="@thirdstorage" />
      <meta name="twitter:creator" content="@thirdstorage" />

      {/* Additional Meta Tags */}
      <meta name="theme-color" content="#000000" />
      <meta name="msapplication-TileColor" content="#000000" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

      {/* Favicon and Icons */}
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="manifest" href="/site.webmanifest" />

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'ThirdStorage',
            description: seo.description,
            url: seo.url,
            applicationCategory: 'StorageApplication',
            operatingSystem: 'Web',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD'
            },
            creator: {
              '@type': 'Organization',
              name: 'ThirdStorage',
              url: 'https://thirdstorage.com'
            },
            featureList: [
              'Decentralized File Storage',
              'Codex Network Integration',
              'API Access',
              'Web3 Storage Solutions'
            ]
          })
        }}
      />

      {article && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: title,
              description: seo.description,
              image: seo.image,
              url: seo.url,
              datePublished: new Date().toISOString(),
              author: {
                '@type': 'Organization',
                name: 'ThirdStorage'
              },
              publisher: {
                '@type': 'Organization',
                name: 'ThirdStorage',
                logo: {
                  '@type': 'ImageObject',
                  url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://thirdstorage.com'}/logo.png`
                }
              }
            })
          }}
        />
      )}
    </Head>
  );
} 