import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";

import { getSortedPostsData } from "@/lib/posts";

export default async function Home() {
  const allPostsData = await getSortedPostsData();

  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
      {allPostsData.slice(0, 5).map((post) => {
        return (
          <Card key={post.id} className="w-full max-w-lg">
            <CardHeader className="justify-between">
              <p className="text-lg font-bold">{post.title}</p>
              <p className="text-sm text-gray-500">{post.date}</p>
            </CardHeader>
            <Divider />
            <CardBody>
              <p>{post.contentPreview}</p>
            </CardBody>
            <CardFooter>
              <Button as={Link} href={`/blog/${post.id}`}>
                Read More
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </section>
  );
}
