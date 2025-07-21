import { GetServerSideProps } from 'next';

function generateRobotsTxt() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thirdstorage.com';
  
  return `User-agent: *
Allow: /
Allow: /gateway
Allow: /status

# Disallow private areas
Disallow: /dashboard
Disallow: /api/
Disallow: /gateway/rate-limited

# Allow specific API endpoints that should be indexed
Allow: /api/gateway/

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Crawl delay to be respectful
Crawl-delay: 1`;
}

function RobotsTxt() {
  // getServerSideProps will do the heavy lifting
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  // Generate the robots.txt
  const robotsTxt = generateRobotsTxt();

  res.setHeader('Content-Type', 'text/plain');
  // Cache for 24 hours
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate');
  res.write(robotsTxt);
  res.end();

  return {
    props: {},
  };
};

export default RobotsTxt; 