import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { getStats, getTop, formatTotalTime } from "@/lib/stats";
import { Layout } from "@/components/Layout";

const Settings = () => {
  const [total, setTotal] = useState(0);
  const [topArtists, setTopArtists] = useState<[string, number][]>([]);
  const [topSongs, setTopSongs] = useState<[string, number][]>([]);
  const [topArtistsPlays, setTopArtistsPlays] = useState<[string, number][]>([]);
  const [topSongsPlays, setTopSongsPlays] = useState<[string, number][]>([]);

  useEffect(() => {
    const s = getStats();
    setTotal(s.totalSeconds);
    setTopArtists(getTop(s.byArtistSeconds, 5));
    setTopSongs(getTop(s.bySongSeconds, 5));
    setTopArtistsPlays(getTop(s.playCountsArtist, 5));
    setTopSongsPlays(getTop(s.playCountsSong, 5));
  }, []);

  return (
    <Layout>
      <div className="container px-4 py-8 md:px-6" dir="rtl">
        <h2 className="text-3xl font-bold mb-6">الإعدادات والإحصائيات</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-4">
            <h3 className="text-xl font-semibold mb-2">الوقت الذي قضيته في التطبيق</h3>
            <p className="text-muted-foreground">{formatTotalTime(total)}</p>
          </Card>

          <Card className="p-4">
            <h3 className="text-xl font-semibold mb-2">أكثر 5 مغنين استمعت لهم (بالوقت)</h3>
            <ul className="space-y-2">
              {topArtists.map(([name, secs]) => (
                <li key={name} className="flex justify-between">
                  <span>{name}</span>
                  <span className="text-muted-foreground">{secs} ثانية</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4">
            <h3 className="text-xl font-semibold mb-2">أكثر 5 أغاني استمعت لها (بالوقت)</h3>
            <ul className="space-y-2">
              {topSongs.map(([id, secs]) => (
                <li key={id} className="flex justify-between">
                  <span>{id}</span>
                  <span className="text-muted-foreground">{secs} ثانية</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4">
            <h3 className="text-xl font-semibold mb-2">أكثر 5 مغنين (عدد مرات التشغيل)</h3>
            <ul className="space-y-2">
              {topArtistsPlays.map(([name, count]) => (
                <li key={name} className="flex justify-between">
                  <span>{name}</span>
                  <span className="text-muted-foreground">{count} مرة</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4">
            <h3 className="text-xl font-semibold mb-2">أكثر 5 أغاني (عدد مرات التشغيل)</h3>
            <ul className="space-y-2">
              {topSongsPlays.map(([id, count]) => (
                <li key={id} className="flex justify-between">
                  <span>{id}</span>
                  <span className="text-muted-foreground">{count} مرة</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
