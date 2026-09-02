const fs = require('fs');
const path = require('path');

const GROUPS = {
  '1': {
    nameEn: 'TOD BEIN SPORTS',
    nameAr: 'TOD BEIN SPORTS',
    file: 'TOD BEIN SPORTS.m3u'
  },
  '2': {
    nameEn: 'BEIN SPORTS MOOM',
    nameAr: 'BEIN SPORTS MOOM',
    file: 'BEIN SPORTS MOOM.m3u'
  },
  '3': {
    nameEn: 'ALWAN MOOM SPORT',
    nameAr: 'ALWAN MOOM SPORT',
    file: 'ALWAN MOOM SPORT.m3u'
  },
  '4': {
    nameEn: 'FADJR MOOM SPORT',
    nameAr: 'FADJR MOOM SPORT',
    file: 'FADJR MOOM SPORT.m3u'
  },
  '5': {
    nameEn: 'BEIN SPORTS',
    nameAr: 'BEIN SPORTS',
    file: 'BEIN SPORTS.m3u'
  },
  '6': {
    nameEn: 'ALKASS SPORTS',
    nameAr: 'ALKASS SPORTS',
    file: 'alkass.m3u'
  }
};

const LOGO =
  'https://i.imageupload.app/6a082ae964db7774dd08.png';

/* =========================================================
   ATTRIBUTE READER
========================================================= */

function getAttribute(line, attribute) {
  if (!line) return '';

  const regex = new RegExp(
    attribute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
    '\\s*=\\s*"([^"]*)"',
    'i'
  );

  const match = line.match(regex);

  return match && match[1]
    ? match[1].trim()
    : '';
}

/* =========================================================
   QUALITY NORMALIZATION
========================================================= */

function normalizeQuality(value) {
  if (!value) {
    return '';
  }

  let q = String(value)
    .trim()
    .toUpperCase();

  q = q.replace(/\s+/g, ' ');

  if (q === 'LON' || q === 'LONG' || q === 'LOW') {
    return 'LON';
  }

  if (q === 'SD') {
    return 'SD';
  }

  if (q === 'HD') {
    return 'HD';
  }

  if (q === 'FHD') {
    return 'FHD';
  }

  if (q === 'UHD') {
    return 'UHD';
  }

  if (q === '4K') {
    return '4K';
  }

  if (q === '8K') {
    return '8K';
  }

  const numeric = q.match(/(\d{3,5})\s*P?/);

  if (numeric) {
    return `${numeric[1]}P`;
  }

  return q;
}

/* =========================================================
   EXTRACT QUALITY FROM NAME
========================================================= */

function extractQualityFromName(name) {
  if (!name) {
    return '';
  }

  const text = name.trim();

  /*
   LON
  */

  if (/\bLON\b/i.test(text)) {
    return 'LON';
  }

  /*
   Numeric
   240P / 244P / 360P / 480P / 720P / 1080P ...
  */

  const numeric = text.match(
    /\b(144|240|244|360|480|576|720|900|1080|1440|2160|2880|4320)P?\b/i
  );

  if (numeric) {
    return `${numeric[1]}P`;
  }

  /*
   Text
  */

  const textQuality = text.match(
    /\b(SD|HD|FHD|UHD|4K|8K|HDR10\+?|HDR|DV)\b/i
  );

  if (textQuality) {
    return textQuality[1].toUpperCase();
  }

  return '';
}

/* =========================================================
   EXTRACT QUALITY
   PRIORITY:
   1 tvg-quality
   2 tvg-name
   3 channel name
========================================================= */

function extractQuality(info, originalName) {
  const tvgQuality = getAttribute(info, 'tvg-quality');

  if (tvgQuality) {
    return normalizeQuality(tvgQuality);
  }

  const tvgName = getAttribute(info, 'tvg-name');

  const fromTvgName = extractQualityFromName(tvgName);

  if (fromTvgName) {
    return fromTvgName;
  }

  return extractQualityFromName(originalName);
}

/* =========================================================
   REMOVE QUALITY FROM DISPLAY NAME
========================================================= */

function cleanChannelName(name) {
  if (!name) {
    return '';
  }

  let result = String(name).trim();

  /*
   Remove LON
  */

  result = result.replace(
    /\s+\bLON\b\s*$/i,
    ''
  );

  /*
   Remove SD / HD / FHD / UHD / 4K / 8K
  */

  result = result.replace(
    /\s+\b(?:SD|HD|FHD|UHD|4K|8K|HDR10\+?|HDR|DV)\b\s*$/i,
    ''
  );

  /*
   Remove numeric quality
  */

  result = result.replace(
    /\s+\b(?:144|240|244|360|480|576|720|900|1080|1440|2160|2880|4320)P?\b\s*$/i,
    ''
  );

  return result.trim();
}

/* =========================================================
   QUALITY SORT
========================================================= */

function qualityPriority(quality) {
  if (!quality) {
    return 999999;
  }

  const q = normalizeQuality(quality);

  /*
   LON MUST ALWAYS BE FIRST
  */

  if (q === 'LON') {
    return 0;
  }

  /*
   Requested order:
   LON
   244P / 240P
   360P
   then other qualities
  */

  const special = {
    '244P': 10,
    '240P': 10,
    '360P': 20
  };

  if (special[q] !== undefined) {
    return special[q];
  }

  /*
   Standard numeric quality
  */

  const numeric = q.match(/^(\d+)P$/);

  if (numeric) {
    return 100 + parseInt(numeric[1], 10);
  }

  /*
   Text qualities
  */

  const text = {
    'SD': 500,
    'HD': 600,
    'FHD': 700,
    'UHD': 800,
    '4K': 800,
    'HDR': 900,
    'HDR10': 900,
    'HDR10+': 900,
    'DV': 900,
    '8K': 1000
  };

  if (text[q] !== undefined) {
    return text[q];
  }

  return 999999;
}

/* =========================================================
   SORT QUALITIES
========================================================= */

function sortQualities(qualities) {
  return qualities.sort((a, b) => {
    const pa = qualityPriority(a.quality);
    const pb = qualityPriority(b.quality);

    if (pa !== pb) {
      return pa - pb;
    }

    return String(a.quality)
      .localeCompare(
        String(b.quality),
        undefined,
        {
          numeric: true,
          sensitivity: 'base'
        }
      );
  });
}

/* =========================================================
   READ PLAYLIST
========================================================= */

function readPlaylist(groupId) {
  const group = GROUPS[String(groupId)];

  if (!group) {
    return [];
  }

  const filePath = path.join(
    process.cwd(),
    'channels',
    group.file
  );

  console.log('====================================');
  console.log('Reading group:', groupId);
  console.log('File:', group.file);
  console.log('Path:', filePath);
  console.log('====================================');

  if (!fs.existsSync(filePath)) {
    console.error(
      'M3U FILE NOT FOUND:',
      filePath
    );

    return [];
  }

  let text;

  try {
    text = fs.readFileSync(
      filePath,
      'utf8'
    );
  } catch (error) {
    console.error(
      'READ FILE ERROR:',
      error
    );

    return [];
  }

  /*
   Remove BOM
  */

  text = text.replace(
    /^\uFEFF/,
    ''
  );

  /*
   Split lines
  */

  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim());

  /*
   IMPORTANT:
   Group by TVG-ID.
   
   tvg-id is the PRIMARY KEY.
   
   This prevents:
   
   beIN1 LON
   beIN1 SD
   beIN1 HD
   
   from becoming 3 channels.
   
   They become ONE channel.
  */

  const channelMap = new Map();

  let autoId = 0;

  /*
   Parse M3U
  */

  for (
    let i = 0;
    i < lines.length;
    i++
  ) {
    const line = lines[i];

    if (!line) {
      continue;
    }

    if (
      !line
        .toUpperCase()
        .startsWith('#EXTINF')
    ) {
      continue;
    }

    const info = line;

    /*
     Channel name after comma
    */

    const nameMatch =
      info.match(/,(.*)$/);

    let originalName =
      nameMatch
        ? nameMatch[1].trim()
        : '';

    if (!originalName) {
      originalName = `Channel ${++autoId}`;
    }

    /*
     TVG-ID
    */

    let tvgId =
      getAttribute(
        info,
        'tvg-id'
      );

    /*
     If tvg-id doesn't exist,
     use cleaned channel name.
    */

    const cleanedName =
      cleanChannelName(
        originalName
      );

    if (!tvgId) {
      tvgId =
        cleanedName
          .toLowerCase()
          .replace(/\s+/g, '_');
    }

    /*
     Quality
   
     tvg-quality first,
     then tvg-name,
     then visible name.
    */

    const quality =
      extractQuality(
        info,
        originalName
      );

    /*
     If no quality exists,
     don't invent one.
    */

    const finalQuality =
      quality || 'AUTO';

    /*
     Logo
    */

    const logo =
      getAttribute(
        info,
        'tvg-logo'
      ) || LOGO;

    /*
     Group
    */

    const m3uGroupName =
      getAttribute(
        info,
        'group-title'
      ) || group.nameEn;

    /*
     STREAM URL
   
     Read the line immediately
     after EXTINF.
    */

    let link = '';

    let j = i + 1;

    while (
      j < lines.length &&
      !lines[j]
    ) {
      j++;
    }

    if (
      j < lines.length &&
      !lines[j].startsWith('#')
    ) {
      link =
        lines[j].trim();

      i = j;
    }

    /*
     No URL
    */

    if (!link) {
      console.warn(
        'Channel without stream:',
        originalName
      );

      continue;
    }

    /*
     PRIMARY GROUP KEY
   
     TVG-ID ONLY.
     
     Do NOT use:
     - quality
     - URL
     - display name
    */

    const mapKey =
      String(tvgId)
        .trim()
        .toLowerCase();

    /*
     Create channel once
    */

    if (!channelMap.has(mapKey)) {
      channelMap.set(
        mapKey,
        {
          name:
            cleanedName ||
            originalName,

          logo: logo,

          mobile_logo: logo,

          real_channel_logo: logo,

          logo_name:
            cleanedName ||
            originalName,

          tvg_id: tvgId,

          group_title:
            m3uGroupName,

          qualities: []
        }
      );
    }

    /*
     Get existing channel
    */

    const channel =
      channelMap.get(mapKey);

    /*
     If first entry had empty
     name, update it.
    */

    if (
      !channel.name &&
      cleanedName
    ) {
      channel.name =
        cleanedName;
    }

    /*
     Keep first valid logo
    */

    if (
      (!channel.logo ||
       channel.logo === LOGO) &&
      logo
    ) {
      channel.logo = logo;

      channel.mobile_logo = logo;

      channel.real_channel_logo = logo;
    }

    /*
     QUALITY DUPLICATE CHECK
   
     IMPORTANT:
     Same quality + different URL
     should NOT overwrite existing
     quality.
     
     But if same quality appears
     multiple times, first one wins.
    */

    const alreadyExists =
      channel.qualities.some(
        q =>
          String(q.quality)
            .toUpperCase() ===
          String(finalQuality)
            .toUpperCase()
      );

    if (!alreadyExists) {
      channel.qualities.push({
        quality:
          finalQuality,

        /*
         Main field
        */

        link:
          link,

        /*
         Compatibility fields
         for different clients.
        */

        url:
          link,

        streamUrl:
          link
      });
    }
  }

  /*
   Convert Map to Array
  */

  const channels = [];

  let channelNumber = 1;

  for (
    const channel
    of channelMap.values()
  ) {
    /*
     Sort qualities
    */

    sortQualities(
      channel.qualities
    );

    /*
     Main stream
   
     First quality is the
     currently selected quality.
     
     LON will be first when exists.
    */

    const mainQuality =
      channel.qualities[0];

    const link =
      mainQuality
        ? mainQuality.link
        : '';

    /*
     Second stream
    */

    const link2 =
      channel.qualities[1]
        ? channel.qualities[1].link
        : '';

    /*
     Third stream
    */

    const link3 =
      channel.qualities[2]
        ? channel.qualities[2].link
        : '';

    /*
     Channel ID
    */

    const channelId =
      `${groupId}_${channelNumber}`;

    /*
     Final channel
   
     ONE CARD ONLY.
     
     All qualities remain inside:
     
     qualities[]
    */

    channels.push({
      id:
        channelId,

      id_sliders:
        null,

      id_custom_list:
        null,

      name_en:
        channel.name,

      name_ar:
        channel.name,

      id_groups:
        String(groupId),

      groups_name_en:
        group.nameEn,

      groups_name_ar:
        group.nameAr,

      groups_main_icon:
        LOGO,

      groups_sub_icon:
        LOGO,

      groups_logo:
        LOGO,

      groups_mobile_logo:
        LOGO,

      groups_link:
        '',

      logo:
        channel.logo,

      mobile_logo:
        channel.mobile_logo,

      real_channel_logo:
        channel.real_channel_logo,

      logo_name:
        channel.logo_name,

      /*
       Current/default stream
      */

      link:
        link,

      /*
       Compatibility
      */

      link2:
        link2,

      link3:
        link3,

      /*
       ALL QUALITIES
      */

      qualities:
        channel.qualities,

      /*
       Metadata
      */

      group_title:
        channel.group_title,

      tvg_id:
        channel.tvg_id,

      quality_count:
        channel.qualities.length,

      /*
       Current quality
      */

      current_quality:
        mainQuality
          ? mainQuality.quality
          : '',

      /*
       Current URL
      */

      stream_url:
        link
    });

    channelNumber++;
  }

  console.log(
    `Group ${groupId} loaded: ${channels.length} channels`
  );

  /*
   Debug information
  */

  channels.forEach(channel => {
    console.log(
      `[CHANNEL] ${channel.name_en}`
    );

    console.log(
      `  tvg-id: ${channel.tvg_id}`
    );

    console.log(
      `  qualities: ${channel.qualities
        .map(q => q.quality)
        .join(' | ')}`
    );

    console.log(
      `  count: ${channel.quality_count}`
    );
  });

  return channels;
}

/* =========================================================
   SUCCESS RESPONSE
========================================================= */

function success(data) {
  return {
    api_status:
      200,

    api_message:
      'success',

    data:
      data
  };
}

/* =========================================================
   GET GROUPS - مع ترتيب مخصص
========================================================= */

function getGroups() {
  // الترتيب المطلوب حسب الطلب
  const order = ['1', '5', '3', '2', '4', '6'];

  return order.map(id => {
    const group = GROUPS[id];
    return {
      id: id,
      name_en: group.nameEn,
      name_ar: group.nameAr,
      logo: LOGO,
      mobile_logo: LOGO,
      main_icon: LOGO,
      sub_icon: LOGO,
      link: '',
      Maintenance: '0'
    };
  });
}

/* =========================================================
   API
========================================================= */

module.exports = (
  req,
  res
) => {
  const url =
    new URL(
      req.url,
      'https://localhost'
    );

  const pathname =
    url.pathname.replace(
      /\/+$/,
      ''
    ) || '/';

  /*
   GROUP ID
  */

  const groupId =
    url.searchParams.get(
      'id_groups'
    ) ||
    url.searchParams.get(
      'group'
    );

  /*
   CHANNEL ID
  */

  const channelId =
    url.searchParams.get(
      'id_channel'
    );

  /*
   HEADERS
  */

  res.setHeader(
    'Access-Control-Allow-Origin',
    '*'
  );

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, OPTIONS'
  );

  res.setHeader(
    'Access-Control-Allow-Headers',
    '*'
  );

  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate'
  );

  res.setHeader(
    'Content-Type',
    'application/json; charset=utf-8'
  );

  /*
   OPTIONS
  */

  if (
    req.method === 'OPTIONS'
  ) {
    return res
      .status(200)
      .end();
  }

  try {
    /*
     /api?group=1
    */

    if (
      pathname === '/api' &&
      groupId
    ) {
      if (
        !GROUPS[
          String(groupId)
        ]
      ) {
        return res
          .status(400)
          .json({
            api_status:
              400,

            api_message:
              'Invalid group',

            data:
              []
          });
      }

      const channels =
        readPlaylist(
          groupId
        );

      return res
        .status(200)
        .json(
          success(channels)
        );
    }

    /*
     /api
     ALL GROUPS
    */

    if (
      pathname === '/api' &&
      !groupId
    ) {
      return res
        .status(200)
        .json(
          success(
            getGroups()
          )
        );
    }

    /*
     /api/groups
    */

    if (
      pathname === '/api/groups'
    ) {
      return res
        .status(200)
        .json(
          success(
            getGroups()
          )
        );
    }

    /*
     /api/channels?group=1
    */

    if (
      pathname === '/api/channels'
    ) {
      const id =
        groupId || '1';

      if (
        !GROUPS[
          String(id)
        ]
      ) {
        return res
          .status(400)
          .json({
            api_status:
              400,

            api_message:
              'Invalid group',

            data:
              []
          });
      }

      const channels =
        readPlaylist(id);

      return res
        .status(200)
        .json(
          success(channels)
        );
    }

    /*
     /api/channel?id_channel=1_1
    */

    if (
      pathname === '/api/channel'
    ) {
      if (!channelId) {
        return res
          .status(200)
          .json(
            success([])
          );
      }

      let channel =
        null;

      for (
        const id
        of Object.keys(GROUPS)
      ) {
        const channels =
          readPlaylist(id);

        const found =
          channels.find(
            x =>
              x.id ===
              channelId
          );

        if (found) {
          channel =
            found;

          break;
        }
      }

      return res
        .status(200)
        .json(
          success(
            channel
              ? [channel]
              : []
          )
        );
    }

    /*
     Empty endpoints
    */

    if (
      pathname ===
        '/api/sliders' ||

      pathname ===
        '/api/slider_items' ||

      pathname ===
        '/api/custom_list' ||

      pathname ===
        '/api/custom_list_items' ||

      pathname ===
        '/api/schedules'
    ) {
      return res
        .status(200)
        .json(
          success([])
        );
    }

    /*
     NOT FOUND
    */

    return res
      .status(404)
      .json({
        api_status:
          404,

        api_message:
          'Not found',

        data:
          []
      });
  } catch (error) {
    console.error(
      'API ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        api_status:
          500,

        api_message:
          'Server error',

        data:
          []
      });
  }
};
