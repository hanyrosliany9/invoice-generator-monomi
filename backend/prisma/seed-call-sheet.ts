import { PrismaClient, CastWorkStatus, CallStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const callSheetId = 'cmjic1tvf000314ajw5r0qipo';

  // Update the call sheet with sample data
  const updated = await prisma.callSheet.update({
    where: { id: callSheetId },
    data: {
      // Header Info
      productionName: 'WE STILL SAY GRACE',
      director: 'John Smith',
      producer: 'Jane Doe',
      companyName: 'Still Grace Pictures, LLC',
      companyAddress: '1533 Lakewood Avenue, Quincy, MA 02169',

      // Personnel
      upm: 'Michael Johnson',
      firstAd: 'Patrick Lee',
      secondAd: 'Sarah Williams',
      secondAdPhone: '(555) 123-4567',
      productionOfficePhone: '(555) 234-5678',
      setMedic: 'Dr. Robert Chen',
      setMedicPhone: '(555) 345-6789',

      // Version Info
      scriptVersion: 'WHITE',
      scheduleVersion: 'WHITE',
      dayNumber: 15,
      totalDays: 42,

      // Date & Times
      shootDate: new Date('2025-05-26'),
      crewCallTime: '5:00 PM',
      firstShotTime: '6:30 PM',
      estimatedWrap: '11:00 PM',
      lunchTime: '8:00 PM',

      // Location
      locationName: '33677 Sierra Vallejo Road',
      locationAddress: 'Santa Clarita, CA 91390',

      // Logistics
      basecamp: '33677 Sierra Vallejo Road, Santa Clarita, CA 91390',
      crewParking: 'On location. Park next to the trailers.',
      bathrooms: 'On site - Porta-potties',
      lunchLocation: 'Craft Services Tent',
      workingTrucks: 'Back Lot',

      // Weather
      weatherHigh: 87,
      weatherLow: 55,
      weatherCondition: 'Partly Cloudy',
      sunrise: '5:46 AM',
      sunset: '8:56 PM',

      // Emergency
      nearestHospital: 'Providence Holy Cross Medical Center',
      hospitalAddress: '38600 Medical Center Dr, Palmdale, CA 93551',
      hospitalPhone: '(661) 555-0100',

      // Notes
      safetyNotes: 'Absolutely NO open-toed shoes on set. Report any and all safety concerns to ADs and Production. See something, say something. Safety first!',
      announcements: 'No social media posting of any photos/information pertaining to story or set activity without prior Producer(s) approval. Cell phone use prohibited when actors are on set.',
      walkieChannels: 'Ch 1: Production | Ch 2: Camera | Ch 3: Sound | Ch 4: Grips',
      productionNotes: 'Set medic: John Doe • 540-555-75S5. Catering: Local Catering • Local phone. Custom Specs Version: White • 9/2/12. Custom Side Jobs: Version: Pink • 9/2/12',

      // Status
      status: 'READY',
    },
    include: {
      castCalls: true,
      crewCalls: true,
      scenes: true,
    },
  });

  // Add sample cast
  await prisma.callSheetCast.deleteMany({
    where: { callSheetId },
  });

  const castData = [
    { castNumber: '1', actorName: 'Bruce Davison', character: 'HAROLD', workStatus: CastWorkStatus.WF, callTime: '7:45 PM', pickupTime: '7:45 PM', onSetTime: '8:00 PM', muCallTime: '7:30 PM' },
    { castNumber: '2', actorName: 'Holly Taylor', character: 'MAGGIE', workStatus: CastWorkStatus.WF, callTime: '5:30 PM', pickupTime: '5:30 PM', onSetTime: '6:30 PM', muCallTime: '5:15 PM' },
    { castNumber: '4', actorName: 'Rita Volk', character: 'SARAH', workStatus: CastWorkStatus.WF, callTime: '7:00 PM', pickupTime: '7:00 PM', onSetTime: '8:00 PM', muCallTime: '6:45 PM' },
    { castNumber: '5', actorName: 'Dallas Hart', character: 'FISHER', workStatus: CastWorkStatus.WF, callTime: '5:05 PM', pickupTime: '5:05 PM', onSetTime: '8:00 PM', muCallTime: '4:50 PM' },
    { castNumber: '6', actorName: 'Xavier J. Watson', character: 'LUKE', workStatus: CastWorkStatus.WF, callTime: '6:30 PM', pickupTime: '6:30 PM', onSetTime: '6:30 PM', muCallTime: '6:15 PM' },
    { castNumber: '7', actorName: 'Frankie Wolf', character: 'RANDY', workStatus: CastWorkStatus.WF, callTime: '6:30 PM', pickupTime: '6:30 PM', onSetTime: '8:00 PM', muCallTime: '6:15 PM' },
  ];

  for (const cast of castData) {
    await prisma.callSheetCast.create({
      data: {
        callSheetId,
        ...cast,
        status: CallStatus.PENDING,
        order: castData.indexOf(cast),
      },
    });
  }

  // Add sample crew
  await prisma.callSheetCrew.deleteMany({
    where: { callSheetId },
  });

  const crewData = [
    { department: 'PRODUCTION', position: 'Director', name: 'John Smith', callTime: '5:00 PM', phone: '(555) 111-1111' },
    { department: 'PRODUCTION', position: '1st AD', name: 'Patrick Lee', callTime: '4:30 PM', phone: '(555) 222-2222' },
    { department: 'PRODUCTION', position: '2nd AD', name: 'Sarah Williams', callTime: '4:30 PM', phone: '(555) 123-4567' },
    { department: 'PRODUCTION', position: 'UPM', name: 'Michael Johnson', callTime: '2:00 PM', phone: '(555) 333-3333' },
    { department: 'CAMERA', position: 'DP', name: 'Robert Martinez', callTime: '4:00 PM', phone: '(555) 444-4444' },
    { department: 'CAMERA', position: 'Camera Operator', name: 'Lisa Chen', callTime: '4:00 PM', phone: '(555) 555-5555' },
    { department: 'CAMERA', position: '1st AC', name: 'David Park', callTime: '4:00 PM', phone: '(555) 666-6666' },
    { department: 'CAMERA', position: '2nd AC', name: 'Amanda Walsh', callTime: '4:00 PM', phone: '(555) 777-7777' },
    { department: 'SOUND', position: 'Sound Mixer', name: 'John Anderson', callTime: '4:00 PM', phone: '(555) 888-8888' },
    { department: 'SOUND', position: 'Boom Operator', name: 'Mike Thompson', callTime: '4:00 PM', phone: '(555) 999-9999' },
    { department: 'GRIPS', position: 'Key Grip', name: 'Chris Davis', callTime: '3:30 PM', phone: '(555) 101-0101' },
    { department: 'GRIPS', position: 'Best Boy', name: 'Tom Wilson', callTime: '3:30 PM', phone: '(555) 102-0102' },
    { department: 'LIGHTING', position: 'Gaffer', name: 'Steve Johnson', callTime: '3:30 PM', phone: '(555) 103-0103' },
    { department: 'LIGHTING', position: 'Key Lighting PA', name: 'Jennifer Brown', callTime: '3:30 PM', phone: '(555) 104-0104' },
    { department: 'ART', position: 'Production Designer', name: 'Maria Garcia', callTime: '3:00 PM', phone: '(555) 105-0105' },
    { department: 'ART', position: 'Set Decorator', name: 'James Murphy', callTime: '3:00 PM', phone: '(555) 106-0106' },
    { department: 'CRAFT SERVICE', position: 'Craft Services Lead', name: 'Susan Kelly', callTime: '3:00 AM', phone: '(555) 107-0107' },
    { department: 'WARDROBE', position: 'Costume Designer', name: 'Nicole Taylor', callTime: '3:00 PM', phone: '(555) 108-0108' },
    { department: 'HAIR/MAKEUP', position: 'Hair Department Head', name: 'Rachel Green', callTime: '5:00 PM', phone: '(555) 109-0109' },
    { department: 'HAIR/MAKEUP', position: 'Makeup Artist', name: 'Emma White', callTime: '5:00 PM', phone: '(555) 110-0110' },
  ];

  for (const crew of crewData) {
    await prisma.callSheetCrew.create({
      data: {
        callSheetId,
        ...crew,
      },
    });
  }

  // Add sample scenes
  await prisma.callSheetScene.deleteMany({
    where: { callSheetId },
  });

  const scenesData = [
    { sceneNumber: '92', intExt: 'EXT.', dayNight: 'N', sceneName: 'GRAVEL ROAD', description: 'Maggie is slowly walking down the road. SRAF pauses by. Looks where she is going. BE ON!', castIds: '2', pageCount: 3/8, location: '33677 Sierra Vallejo Road' },
    { sceneNumber: '81', intExt: 'EXT.', dayNight: 'N', sceneName: 'FIELD IN FRONT OF GARAGE', description: 'Harold looks last cross w/ F on it. Sets all ablaze. Tries to hug Maggie.', castIds: '1,2,4,5,6,7', pageCount: 1, location: '33677 Sierra Vallejo Road' },
    { sceneNumber: '80', intExt: 'EXT.', dayNight: 'N', sceneName: 'FRONT YARD', description: "Fisher's body lies face up. M crawls to body. Sarah embraces Harold.", castIds: '1,2,4,5', pageCount: 2 + 1/8, location: '33677 Sierra Vallejo Road' },
    { sceneNumber: '78', intExt: 'EXT.', dayNight: 'N', sceneName: 'DITCH/FRONT YARD', description: 'F is all drop balls a ditch. Running from Harold. Jump out rear crosses. Take off to escape.', castIds: '1,2,4,5,6,7', pageCount: 1 + 7/8, location: '33677 Sierra Vallejo Road' },
    { sceneNumber: '73', intExt: 'EXT.', dayNight: 'N', sceneName: 'FIELD IN FRONT OF GARAGE', description: "Harold is next to a group area in the back of the barn. He's building a tg. wooden cross.", castIds: '1', pageCount: 2/8, location: '33677 Sierra Vallejo Road' },
  ];

  for (const scene of scenesData) {
    await prisma.callSheetScene.create({
      data: {
        callSheetId,
        ...scene,
      },
    });
  }

  console.log('✅ Call sheet populated with sample data!');
  console.log(`Call Sheet ID: ${callSheetId}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
