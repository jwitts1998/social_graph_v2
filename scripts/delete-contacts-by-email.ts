/**
 * One-off script to delete contact records by email address.
 * Cascade deletes will remove related rows in child tables automatically.
 *
 * Usage:
 *   npx tsx scripts/delete-contacts-by-email.ts
 *
 * Prerequisites:
 *   - .env with VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const EMAILS_TO_DELETE = [
  'jmaher@blizzard.com',
  'mike.sepso@activision.com',
  'kevin.mayer@disney.com',
  'alan.saporta@disney.com',
  'richard.webby@disney.com',
  'john.love@disney.com',
  'arjun.metre@intel.com',
  'tyan@vipr.xyz',
  'matthewcookusa@gmail.com',
  'sean@thesubpac.com',
  'jabiodun@truecar.com',
  'krishna.achanta@xero.com',
  'mohammad.adib@gotinder.com',
  'victor.adu@westernunion.com',
  'shamik@doubledutch.me',
  'saket@doubledutch.me',
  'raheel.ahmad@capitalone.com',
  'sahmed@ucdavis.edu',
  'jonakhtar@herbalife.com',
  'salam@blastmotion.com',
  'sergey@21.co',
  'wisama@ensenta.com',
  'alicea@google.com',
  'allison@hoteltonight.com',
  'kevin@mybasis.com',
  'laith.alnagem@vevo.com',
  'muhammad@pingtank.com',
  'eric.amorde@fismobile.com',
  'gary@aol.com',
  'jagadish.anavankot@yahoo-inc.com',
  'jagadishanavankot@yahoo-inc.com',
  'janders@evernote.com',
  'danderson@lungfishgames.com',
  'landerson@mobiquityinc.com',
  'jandresakis@precisiondev.net',
  'christian@carezone.com',
  'arai@apple.com',
  'roberto@taptalk.me',
  'rathimoolam@stubhub.com',
  'peter@scopely.com',
  'patrick@yelp.com',
  'faubry@esri.com',
  'avantj@gotinder.com',
  'cayscue@scu.edu',
  'baar.scott@hangwith.com',
  'nick.badal@razerzone.com',
  'ben@getkeepsafe.com',
  'shakeel.badi@ageoflearning.com',
  'nitinb@uber.com',
  'johnbaker@solfoodrestaurant.com',
  'abalan@polariswireless.com',
  'shilpa@edmodo.com',
  'jbalcar@stepleaderdigital.com',
  'jonathan@hoteltonight.com',
  'andrewb@procore.com',
  'kbanks@apple.com',
  'tbarbalet@netflix.com',
  'julien@apple.com',
  'james@imgur.com',
  'ameya.barsode@yahoo-inc.com',
  'kbaskaran@doubledutch.me',
  'danielb@apple.com',
  'rbaumbach@metromile.com',
  'tonny@tendinsights.com',
  'dbeard@groupon.com',
  'matt@accenture.com',
  'jordan@ifttt.com',
  'brian.beckerle@capitalone.com',
  'alexandre.becourt@epitech.eu',
  'jamesbedford@apple.com',
  'kylebegeman@dropbox.com',
  'kbeitz@twitter.com',
  'chris@cog1.com',
  'gbenson@netflix.com',
  'lbernard@politico.com',
  'luca@apple.com',
  'sberrevoets@lyft.com',
  'david.berrios@indiegogo.com',
  'ben@twotoasters.com',
  'anurag.bhatnagar@dictionary.com',
  'bhatnagar@facebook.com',
  'dom@lumosity.com',
  'wes@wesbillman.com',
  'daniel.biran@hightail.com',
  'jeff@bjhstudios.com',
  'john_b@infosys.com',
  'joeblau@amazon.com',
  'ben@weebly.com',
  'eliza@apple.com',
  'fbluemle@paypal.com',
  'dblundell@pandora.com',
  'rbobbins@stitchfix.com',
  'jbobzin@uber.com',
  'anders@liveathos.com',
  'ken.boreham@feeln.com',
  'bryan@1sb.com',
  'troyb@flipboard.com',
  'martin@upthere.com',
  'jeremy@sfcu.org',
];

async function main() {
  const BATCH_SIZE = 50;
  let totalDeleted = 0;

  for (let i = 0; i < EMAILS_TO_DELETE.length; i += BATCH_SIZE) {
    const batch = EMAILS_TO_DELETE.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('contacts')
      .delete()
      .in('email', batch)
      .select('id, email');

    if (error) {
      console.error(`Error deleting batch ${i / BATCH_SIZE + 1}:`, error.message);
      continue;
    }

    const count = data?.length ?? 0;
    totalDeleted += count;
    if (count > 0) {
      console.log(`Batch ${i / BATCH_SIZE + 1}: deleted ${count} contacts`);
      for (const row of data!) {
        console.log(`  - ${row.email} (${row.id})`);
      }
    } else {
      console.log(`Batch ${i / BATCH_SIZE + 1}: no matching contacts found`);
    }
  }

  console.log(`\nDone. Total contacts deleted: ${totalDeleted} / ${EMAILS_TO_DELETE.length} emails searched.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
