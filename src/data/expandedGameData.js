export const expandedGameData = {
  rev1: {
    blanks: [
      { verse: '1:8', textBefore: 'I am the Alpha and the', blank: 'Omega', textAfter: '.', options: ['Omega', 'End', 'Last', 'Beginning'] },
      { verse: '1:12', textBefore: 'I turned around to see the', blank: 'voice', textAfter: 'that was speaking to me.', options: ['voice', 'angel', 'lampstands', 'vision'] },
      { verse: '1:14', textBefore: 'His head and hair were white like', blank: 'wool', textAfter: '.', options: ['wool', 'snow', 'fire', 'linen'] },
      { verse: '1:16', textBefore: 'Out of his mouth came a sharp double-edged', blank: 'sword', textAfter: '.', options: ['sword', 'flame', 'trumpet', 'rod'] },
      { verse: '1:18', textBefore: 'I hold the keys of death and', blank: 'Hades', textAfter: '.', options: ['Hades', 'the abyss', 'life', 'judgment'] },
    ],
    tf: [
      { verse: '1:3', text: 'Blessed is the one who reads the words of this prophecy.', isTrue: true, explanation: 'Correct.' },
      { verse: '1:6', text: 'Jesus made us to be merchants and warriors.', isTrue: false, explanation: 'He made us to be a kingdom and priests.' },
      { verse: '1:7', text: 'Every eye will see him, even those who pierced him.', isTrue: true, explanation: 'Correct.' },
      { verse: '1:10', text: 'John was in the Spirit on the Sabbath.', isTrue: false, explanation: 'The text says on the Lord’s Day.' },
    ],
    builder: [
      { verse: '1:8', chunks: ['I am', 'the Alpha', 'and the Omega,', 'says the Lord God.'] },
      { verse: '1:17', chunks: ['Do not be afraid.', 'I am', 'the First', 'and the Last.'] },
      { verse: '1:19', chunks: ['Write, therefore,', 'what you have seen,', 'what is now', 'and what will take place later.'] },
    ],
  },
  ephesus: {
    blanks: [
      { verse: '2:2', textBefore: 'I know your deeds, your hard work and your', blank: 'perseverance', textAfter: '.', options: ['perseverance', 'sacrifice', 'prayer', 'vision'] },
      { verse: '2:4', textBefore: 'You have forsaken your first', blank: 'love', textAfter: '.', options: ['love', 'faith', 'hope', 'zeal'] },
      { verse: '2:5', textBefore: 'Repent and do the things you did at', blank: 'first', textAfter: '.', options: ['first', 'home', 'church', 'once'] },
      { verse: '2:7', textBefore: 'To him who overcomes, I will give the right to eat from the tree of', blank: 'life', textAfter: '.', options: ['life', 'wisdom', 'truth', 'knowledge'] },
    ],
    tf: [
      { verse: '2:2', text: 'Ephesus tolerated wicked people.', isTrue: false, explanation: 'They tested those who claimed to be apostles.' },
      { verse: '2:6', text: 'The Nicolaitans are praised in Ephesus.', isTrue: false, explanation: 'Their practices were hated.' },
      { verse: '2:3', text: 'Ephesus had persevered and not grown weary for Jesus’ name.', isTrue: true, explanation: 'Correct.' },
    ],
    builder: [
      { verse: '2:5', chunks: ['Repent', 'and do', 'the things', 'you did', 'at first.'] },
      { verse: '2:7', chunks: ['He who has an ear,', 'let him hear', 'what the Spirit says', 'to the churches.'] },
    ],
  },
  smyrna: {
    blanks: [
      { verse: '2:9', textBefore: 'I know your afflictions and your', blank: 'poverty', textAfter: '— yet you are rich!', options: ['poverty', 'weakness', 'sorrow', 'chains'] },
      { verse: '2:10', textBefore: 'Be faithful, even to the point of', blank: 'death', textAfter: '.', options: ['death', 'suffering', 'trial', 'sacrifice'] },
      { verse: '2:10', textBefore: 'You will suffer persecution for', blank: 'ten', textAfter: 'days.', options: ['ten', 'seven', 'three', 'forty'] },
    ],
    tf: [
      { verse: '2:9', text: 'Smyrna was spiritually poor.', isTrue: false, explanation: 'They were materially poor but spiritually rich.' },
      { verse: '2:10', text: 'The crown of life is promised to the faithful.', isTrue: true, explanation: 'Correct.' },
    ],
    builder: [
      { verse: '2:10', chunks: ['Be faithful,', 'even to', 'the point', 'of death,', 'and I will give you', 'the crown of life.'] },
    ],
  },
  pergamum: {
    blanks: [
      { verse: '2:13', textBefore: 'I know where you live—where Satan has his', blank: 'throne', textAfter: '.', options: ['throne', 'altar', 'temple', 'seat'] },
      { verse: '2:17', textBefore: 'To him who overcomes, I will also give some of the hidden', blank: 'manna', textAfter: '.', options: ['manna', 'treasure', 'bread', 'oil'] },
      { verse: '2:12', textBefore: 'These are the words of him who has the sharp, double-edged', blank: 'sword', textAfter: '.', options: ['sword', 'truth', 'rod', 'light'] },
    ],
    tf: [
      { verse: '2:14', text: 'Balaam taught Balak to entice Israel to sin.', isTrue: true, explanation: 'Correct.' },
      { verse: '2:17', text: 'Pergamum is promised a black stone with many names.', isTrue: false, explanation: 'It is a white stone with a new name.' },
    ],
    builder: [
      { verse: '2:12', chunks: ['These are', 'the words', 'of him', 'who has', 'the sharp,', 'double-edged sword.'] },
      { verse: '2:17', chunks: ['I will also give him', 'a white stone', 'with a new name', 'written on it.'] },
    ],
  },
  thyatira: {
    blanks: [
      { verse: '2:20', textBefore: 'You tolerate that woman', blank: 'Jezebel', textAfter: '.', options: ['Jezebel', 'Eve', 'Athaliah', 'Delilah'] },
      { verse: '2:26', textBefore: 'To him who overcomes and does my will to the end, I will give authority over the', blank: 'nations', textAfter: '.', options: ['nations', 'angels', 'churches', 'kings'] },
      { verse: '2:28', textBefore: 'I will also give him the morning', blank: 'star', textAfter: '.', options: ['star', 'sun', 'crown', 'lamp'] },
    ],
    tf: [
      { verse: '2:19', text: 'Thyatira’s deeds were increasing and not decreasing.', isTrue: true, explanation: 'Correct.' },
      { verse: '2:23', text: 'Jesus says he only judges outward actions and not hearts.', isTrue: false, explanation: 'He searches hearts and minds.' },
    ],
    builder: [
      { verse: '2:26', chunks: ['To him who overcomes', 'and does my will', 'to the end,', 'I will give authority', 'over the nations.'] },
    ],
  },
  sardis: {
    blanks: [
      { verse: '3:1', textBefore: 'You have a reputation of being', blank: 'alive', textAfter: ', but you are dead.', options: ['alive', 'holy', 'strong', 'wise'] },
      { verse: '3:2', textBefore: 'Wake up! Strengthen what remains and is about to', blank: 'die', textAfter: '.', options: ['die', 'fall', 'fade', 'perish'] },
      { verse: '3:5', textBefore: 'He who overcomes will, like them, be dressed in', blank: 'white', textAfter: '.', options: ['white', 'linen', 'gold', 'purple'] },
    ],
    tf: [
      { verse: '3:3', text: 'Jesus will come like a thief.', isTrue: true, explanation: 'Correct.' },
      { verse: '3:4', text: 'No one in Sardis remained undefiled.', isTrue: false, explanation: 'A few people had not soiled their clothes.' },
    ],
    builder: [
      { verse: '3:2', chunks: ['Wake up!', 'Strengthen', 'what remains', 'and is about', 'to die.'] },
    ],
  },
  philadelphia: {
    blanks: [
      { verse: '3:8', textBefore: 'I have placed before you an open', blank: 'door', textAfter: 'that no one can shut.', options: ['door', 'gate', 'window', 'path'] },
      { verse: '3:11', textBefore: 'Hold on to what you have, so that no one will take your', blank: 'crown', textAfter: '.', options: ['crown', 'treasure', 'robe', 'reward'] },
      { verse: '3:12', textBefore: 'I will make him a', blank: 'pillar', textAfter: 'in the temple of my God.', options: ['pillar', 'light', 'stone', 'servant'] },
    ],
    tf: [
      { verse: '3:8', text: 'Philadelphia had little strength, yet kept Christ’s word.', isTrue: true, explanation: 'Correct.' },
      { verse: '3:9', text: 'Their enemies would never acknowledge Christ’s love for the church.', isTrue: false, explanation: 'They would learn that Christ loved them.' },
    ],
    builder: [
      { verse: '3:12', chunks: ['Him who overcomes', 'I will make', 'a pillar', 'in the temple', 'of my God.'] },
    ],
  },
  laodicea: {
    blanks: [
      { verse: '3:16', textBefore: 'Because you are', blank: 'lukewarm', textAfter: ', neither hot nor cold, I am about to spit you out of my mouth.', options: ['lukewarm', 'cold', 'hot', 'faithless'] },
      { verse: '3:18', textBefore: 'Buy from me gold refined in the', blank: 'fire', textAfter: '.', options: ['fire', 'furnace', 'light', 'altar'] },
      { verse: '3:20', textBefore: 'Here I am! I stand at the', blank: 'door', textAfter: 'and knock.', options: ['door', 'gate', 'window', 'threshold'] },
    ],
    tf: [
      { verse: '3:19', text: 'Those whom I love I rebuke and discipline.', isTrue: true, explanation: 'Correct.' },
      { verse: '3:17', text: 'Laodicea knew it was wretched, pitiful, poor, blind, and naked.', isTrue: false, explanation: 'They said they needed nothing and did not realize their condition.' },
    ],
    builder: [
      { verse: '3:20', chunks: ['Here I am!', 'I stand', 'at the door', 'and knock.'] },
      { verse: '3:21', chunks: ['To him who overcomes,', 'I will give the right', 'to sit with me', 'on my throne.'] },
    ],
  },
  throne: {
    blanks: [
      { verse: '4:3', textBefore: 'A rainbow resembling an', blank: 'emerald', textAfter: 'encircled the throne.', options: ['emerald', 'ruby', 'sapphire', 'diamond'] },
      { verse: '4:8', textBefore: 'Day and night they never stop saying:', blank: 'Holy', textAfter: ', holy, holy is the Lord God Almighty.', options: ['Holy', 'Worthy', 'Glory', 'Mighty'] },
      { verse: '4:11', textBefore: 'You are worthy, our Lord and God, to receive glory and honor and', blank: 'power', textAfter: '.', options: ['power', 'wisdom', 'praise', 'dominion'] },
    ],
    tf: [
      { verse: '4:4', text: 'Twenty-four elders surrounded the throne.', isTrue: true, explanation: 'Correct.' },
      { verse: '4:7', text: 'All four living creatures had the same face.', isTrue: false, explanation: 'Each had a different appearance.' },
    ],
    builder: [
      { verse: '4:11', chunks: ['You are worthy,', 'our Lord and God,', 'to receive glory', 'and honor', 'and power.'] },
    ],
  },
  scroll: {
    blanks: [
      { verse: '5:1', textBefore: 'The scroll was sealed with', blank: 'seven', textAfter: 'seals.', options: ['seven', 'three', 'twelve', 'ten'] },
      { verse: '5:5', textBefore: 'The Lion of the tribe of', blank: 'Judah', textAfter: 'has triumphed.', options: ['Judah', 'Benjamin', 'Levi', 'Joseph'] },
      { verse: '5:9', textBefore: 'You were slain, and with your blood you purchased men for God from every tribe and language and people and', blank: 'nation', textAfter: '.', options: ['nation', 'kingdom', 'family', 'tongue'] },
    ],
    tf: [
      { verse: '5:6', text: 'The Lamb appeared as if it had been slain.', isTrue: true, explanation: 'Correct.' },
      { verse: '5:8', text: 'The golden bowls were full of wrath only.', isTrue: false, explanation: 'They were full of incense, which are the prayers of the saints.' },
    ],
    builder: [
      { verse: '5:9', chunks: ['You are worthy', 'to take the scroll', 'and to open its seals,', 'because you were slain.'] },
    ],
  },
  horsemen: {
    blanks: [
      { verse: '6:2', textBefore: 'The rider on the white horse held a', blank: 'bow', textAfter: '.', options: ['bow', 'sword', 'crown', 'seal'] },
      { verse: '6:4', textBefore: 'The fiery red horse took peace from the', blank: 'earth', textAfter: '.', options: ['earth', 'sea', 'nations', 'churches'] },
      { verse: '6:8', textBefore: 'A pale horse! Its rider was named', blank: 'Death', textAfter: '.', options: ['Death', 'War', 'Famine', 'Plague'] },
    ],
    tf: [
      { verse: '6:5', text: 'The black horse rider held a pair of scales.', isTrue: true, explanation: 'Correct.' },
      { verse: '6:8', text: 'Hades followed the red horse.', isTrue: false, explanation: 'Hades followed Death on the pale horse.' },
    ],
    builder: [
      { verse: '6:8', chunks: ['Its rider', 'was named Death,', 'and Hades', 'was following close behind him.'] },
    ],
  },
  seals56: {
    blanks: [
      { verse: '6:10', textBefore: 'How long, Sovereign Lord, holy and true, until you judge the inhabitants of the earth and avenge our', blank: 'blood', textAfter: '?', options: ['blood', 'tears', 'suffering', 'faith'] },
      { verse: '6:12', textBefore: 'The sun turned', blank: 'black', textAfter: 'like sackcloth made of goat hair.', options: ['black', 'red', 'white', 'dim'] },
      { verse: '6:14', textBefore: 'The sky receded like a', blank: 'scroll', textAfter: 'rolling up.', options: ['scroll', 'curtain', 'veil', 'book'] },
    ],
    tf: [
      { verse: '6:11', text: 'The martyrs were each given a white robe.', isTrue: true, explanation: 'Correct.' },
      { verse: '6:16', text: 'The kings asked mountains to reveal more truth to them.', isTrue: false, explanation: 'They asked the mountains to fall on them and hide them.' },
    ],
    builder: [
      { verse: '6:17', chunks: ['For the great day', 'of their wrath', 'has come,', 'and who can stand?'] },
    ],
  },
  multitude: {
    blanks: [
      { verse: '7:4', textBefore: 'The number of those who were sealed was', blank: '144000', textAfter: '.', options: ['144000', '12000', '7000', '1000'] },
      { verse: '7:9', textBefore: 'A great multitude that no one could count, from every nation, tribe, people and', blank: 'language', textAfter: '.', options: ['language', 'city', 'land', 'generation'] },
      { verse: '7:14', textBefore: 'They have washed their robes and made them white in the blood of the', blank: 'Lamb', textAfter: '.', options: ['Lamb', 'King', 'Cross', 'Saint'] },
    ],
    tf: [
      { verse: '7:10', text: 'Salvation belongs to our God and to the Lamb.', isTrue: true, explanation: 'Correct.' },
      { verse: '7:17', text: 'The Lamb will lead them to dry wilderness places.', isTrue: false, explanation: 'He will lead them to springs of living water.' },
    ],
    builder: [
      { verse: '7:17', chunks: ['For the Lamb', 'at the center', 'of the throne', 'will be their shepherd.'] },
    ],
  },
  trumpets14: {
    blanks: [
      { verse: '8:7', textBefore: 'There came hail and', blank: 'fire', textAfter: 'mixed with blood.', options: ['fire', 'smoke', 'wind', 'dust'] },
      { verse: '8:10', textBefore: 'A great star, blazing like a', blank: 'torch', textAfter: ', fell from the sky.', options: ['torch', 'sun', 'lamp', 'meteor'] },
      { verse: '8:11', textBefore: 'The name of the star is', blank: 'Wormwood', textAfter: '.', options: ['Wormwood', 'Gall', 'Bitter', 'Abyss'] },
    ],
    tf: [
      { verse: '8:1', text: 'When the seventh seal was opened, there was silence in heaven.', isTrue: true, explanation: 'Correct.' },
      { verse: '8:13', text: 'An eagle cried out only one woe.', isTrue: false, explanation: 'It cried out three woes.' },
    ],
    builder: [
      { verse: '8:13', chunks: ['Woe! Woe! Woe', 'to the inhabitants', 'of the earth,', 'because of the trumpet blasts.'] },
    ],
  },
  locusts: {
    blanks: [
      { verse: '9:3', textBefore: 'Out of the smoke locusts came down upon the', blank: 'earth', textAfter: '.', options: ['earth', 'sea', 'altar', 'city'] },
      { verse: '9:11', textBefore: 'They had as king over them the angel of the Abyss, whose name in Hebrew is Abaddon, and in Greek,', blank: 'Apollyon', textAfter: '.', options: ['Apollyon', 'Legion', 'Belial', 'Mammon'] },
      { verse: '9:20', textBefore: 'The rest of mankind that were not killed by these plagues still did not', blank: 'repent', textAfter: '.', options: ['repent', 'pray', 'hide', 'believe'] },
    ],
    tf: [
      { verse: '9:4', text: 'The locusts could harm those with God’s seal on their foreheads.', isTrue: false, explanation: 'They were told not to harm them.' },
      { verse: '9:6', text: 'In those days men will seek death, but not find it.', isTrue: true, explanation: 'Correct.' },
    ],
    builder: [
      { verse: '9:20', chunks: ['The rest of mankind', 'that were not killed', 'by these plagues', 'still did not repent.'] },
    ],
  },
  angel_scroll: {
    blanks: [
      { verse: '10:2', textBefore: 'He was holding a little', blank: 'scroll', textAfter: ',', options: ['scroll', 'book', 'seal', 'rod'] },
      { verse: '10:9', textBefore: 'It will turn your stomach sour, but in your mouth it will be as sweet as', blank: 'honey', textAfter: '.', options: ['honey', 'sugar', 'wine', 'oil'] },
      { verse: '10:11', textBefore: 'You must prophesy again about many peoples, nations, languages and', blank: 'kings', textAfter: '.', options: ['kings', 'tribes', 'cities', 'armies'] },
    ],
    tf: [
      { verse: '10:4', text: 'John was told to write down what the seven thunders said.', isTrue: false, explanation: 'He was told not to write it.' },
      { verse: '10:6', text: 'There will be no more delay.', isTrue: true, explanation: 'Correct.' },
    ],
    builder: [
      { verse: '10:11', chunks: ['You must prophesy again', 'about many peoples,', 'nations, languages', 'and kings.'] },
    ],
  },
  witnesses: {
    blanks: [
      { verse: '11:3', textBefore: 'I will give power to my two witnesses, and they will prophesy for', blank: '1260', textAfter: 'days.', options: ['1260', '1000', '42', '7'] },
      { verse: '11:15', textBefore: 'The kingdom of the world has become the kingdom of our Lord and of his', blank: 'Christ', textAfter: '.', options: ['Christ', 'saints', 'angel', 'church'] },
      { verse: '11:19', textBefore: 'Then God’s temple in heaven was opened, and within his temple was seen the ark of his', blank: 'covenant', textAfter: '.', options: ['covenant', 'glory', 'law', 'presence'] },
    ],
    tf: [
      { verse: '11:4', text: 'The two witnesses are called two olive trees and two lampstands.', isTrue: true, explanation: 'Correct.' },
      { verse: '11:8', text: 'Their bodies lay in Nineveh.', isTrue: false, explanation: 'Their bodies lay in the great city where their Lord was crucified.' },
    ],
    builder: [
      { verse: '11:15', chunks: ['The kingdom', 'of the world', 'has become', 'the kingdom', 'of our Lord', 'and of his Christ.'] },
    ],
  },
  woman_dragon: {
    blanks: [
      { verse: '12:1', textBefore: 'A woman clothed with the', blank: 'sun', textAfter: '.', options: ['sun', 'moon', 'stars', 'cloud'] },
      { verse: '12:4', textBefore: 'The dragon stood in front of the woman who was about to give birth, so that he might devour her child the moment it was', blank: 'born', textAfter: '.', options: ['born', 'named', 'revealed', 'crowned'] },
      { verse: '12:11', textBefore: 'They overcame him by the blood of the Lamb and by the word of their', blank: 'testimony', textAfter: '.', options: ['testimony', 'faith', 'prayer', 'song'] },
    ],
    tf: [
      { verse: '12:9', text: 'The great dragon is called the ancient serpent, the devil, or Satan.', isTrue: true, explanation: 'Correct.' },
      { verse: '12:12', text: 'The devil came down to earth full of joy because he had a long time.', isTrue: false, explanation: 'He was filled with fury because he knew his time was short.' },
    ],
    builder: [
      { verse: '12:11', chunks: ['They overcame him', 'by the blood', 'of the Lamb', 'and by the word', 'of their testimony.'] },
    ],
  },
  beasts: {
    blanks: [
      { verse: '13:1', textBefore: 'The dragon stood on the shore of the', blank: 'sea', textAfter: '.', options: ['sea', 'river', 'earth', 'desert'] },
      { verse: '13:11', textBefore: 'Then I saw another beast, coming out of the', blank: 'earth', textAfter: '.', options: ['earth', 'sea', 'pit', 'mountains'] },
      { verse: '13:18', textBefore: 'His number is', blank: '666', textAfter: '.', options: ['666', '777', '12', '144'] },
    ],
    tf: [
      { verse: '13:8', text: 'All inhabitants of the earth will worship the beast except those whose names are written in the Lamb’s book of life.', isTrue: true, explanation: 'Correct.' },
      { verse: '13:16', text: 'The mark was only placed on the forehead and never on the hand.', isTrue: false, explanation: 'It was placed on the right hand or forehead.' },
    ],
    builder: [
      { verse: '13:10', chunks: ['This calls for', 'patient endurance', 'and faithfulness', 'on the part', 'of the saints.'] },
    ],
  },
  harvest: {
    blanks: [
      { verse: '14:1', textBefore: 'Then I looked, and there before me was the Lamb, standing on Mount', blank: 'Zion', textAfter: '.', options: ['Zion', 'Sinai', 'Carmel', 'Olivet'] },
      { verse: '14:6', textBefore: 'I saw another angel flying in midair, and he had the eternal', blank: 'gospel', textAfter: '.', options: ['gospel', 'message', 'witness', 'scroll'] },
      { verse: '14:12', textBefore: 'This calls for patient endurance on the part of the saints who obey God’s commandments and remain faithful to', blank: 'Jesus', textAfter: '.', options: ['Jesus', 'truth', 'the Lamb', 'God'] },
    ],
    tf: [
      { verse: '14:7', text: 'The first angel said to worship the beast and his image.', isTrue: false, explanation: 'He called people to worship the Creator.' },
      { verse: '14:13', text: 'Blessed are the dead who die in the Lord from now on.', isTrue: true, explanation: 'Correct.' },
    ],
    builder: [
      { verse: '14:7', chunks: ['Fear God', 'and give him glory,', 'because the hour', 'of his judgment', 'has come.'] },
    ],
  },
  bowls_prep: {
    blanks: [
      { verse: '15:2', textBefore: 'I saw what looked like a sea of', blank: 'glass', textAfter: 'mixed with fire.', options: ['glass', 'crystal', 'bronze', 'ice'] },
      { verse: '15:3', textBefore: 'They sang the song of', blank: 'Moses', textAfter: 'the servant of God and the song of the Lamb.', options: ['Moses', 'David', 'Miriam', 'Israel'] },
      { verse: '15:4', textBefore: 'All nations will come and', blank: 'worship', textAfter: 'before you.', options: ['worship', 'tremble', 'bow', 'gather'] },
    ],
    tf: [
      { verse: '15:1', text: 'The seven last plagues complete God’s wrath.', isTrue: true, explanation: 'Correct.' },
      { verse: '15:8', text: 'Anyone could enter the temple while the plagues were being poured out.', isTrue: false, explanation: 'No one could enter until the seven plagues were completed.' },
    ],
    builder: [
      { verse: '15:4', chunks: ['All nations', 'will come', 'and worship', 'before you.'] },
    ],
  },
  bowls_pour: {
    blanks: [
      { verse: '16:2', textBefore: 'Ugly and painful sores broke out on the people who had the mark of the', blank: 'beast', textAfter: '.', options: ['beast', 'dragon', 'earth', 'city'] },
      { verse: '16:16', textBefore: 'Then they gathered the kings together to the place that in Hebrew is called', blank: 'Armageddon', textAfter: '.', options: ['Armageddon', 'Babylon', 'Megiddo', 'Zion'] },
      { verse: '16:21', textBefore: 'From the sky huge hailstones of about a', blank: 'hundred', textAfter: 'pounds each fell upon men.', options: ['hundred', 'fifty', 'seventy', 'two hundred'] },
    ],
    tf: [
      { verse: '16:5', text: 'The angel of the waters declared God just in these judgments.', isTrue: true, explanation: 'Correct.' },
      { verse: '16:9', text: 'The people repented and glorified God under the fourth bowl.', isTrue: false, explanation: 'They cursed God and refused to repent.' },
    ],
    builder: [
      { verse: '16:15', chunks: ['Blessed is he', 'who stays awake', 'and keeps', 'his clothes with him.'] },
    ],
  },
  prostitute: {
    blanks: [
      { verse: '17:1', textBefore: 'Come, I will show you the punishment of the great', blank: 'prostitute', textAfter: '.', options: ['prostitute', 'city', 'queen', 'harlot'] },
      { verse: '17:5', textBefore: 'On her forehead a name was written: Mystery,', blank: 'Babylon', textAfter: 'the Great.', options: ['Babylon', 'Rome', 'Egypt', 'Tyre'] },
      { verse: '17:14', textBefore: 'The Lamb will overcome them because he is Lord of lords and King of', blank: 'kings', textAfter: '.', options: ['kings', 'nations', 'saints', 'hosts'] },
    ],
    tf: [
      { verse: '17:6', text: 'The woman was drunk with the blood of the saints.', isTrue: true, explanation: 'Correct.' },
      { verse: '17:8', text: 'The beast once was, now is, and will remain forever visible.', isTrue: false, explanation: 'It once was, now is not, and will come up out of the Abyss.' },
    ],
    builder: [
      { verse: '17:14', chunks: ['They will make war', 'against the Lamb,', 'but the Lamb', 'will overcome them.'] },
    ],
  },
  babylon: {
    blanks: [
      { verse: '18:2', textBefore: 'Fallen! Fallen is', blank: 'Babylon', textAfter: 'the Great!', options: ['Babylon', 'Rome', 'Edom', 'Tyre'] },
      { verse: '18:4', textBefore: 'Come out of her, my', blank: 'people', textAfter: '.', options: ['people', 'servants', 'saints', 'children'] },
      { verse: '18:21', textBefore: 'With such violence the great city of Babylon will be thrown down, never to be found', blank: 'again', textAfter: '.', options: ['again', 'alive', 'anywhere', 'there'] },
    ],
    tf: [
      { verse: '18:8', text: 'Her plagues will overtake her in one day.', isTrue: true, explanation: 'Correct.' },
      { verse: '18:23', text: 'All nations were blessed by her sorcery.', isTrue: false, explanation: 'By her magic spell all nations were led astray.' },
    ],
    builder: [
      { verse: '18:4', chunks: ['Come out of her,', 'my people,', 'so that you will not', 'share in her sins.'] },
    ],
  },
  white_horse: {
    blanks: [
      { verse: '19:11', textBefore: 'I saw heaven standing open and there before me was a white', blank: 'horse', textAfter: '.', options: ['horse', 'cloud', 'throne', 'chariot'] },
      { verse: '19:13', textBefore: 'His name is the Word of', blank: 'God', textAfter: '.', options: ['God', 'Life', 'Truth', 'Power'] },
      { verse: '19:16', textBefore: 'On his robe and on his thigh he has this name written: King of kings and Lord of', blank: 'lords', textAfter: '.', options: ['lords', 'hosts', 'ages', 'heaven'] },
    ],
    tf: [
      { verse: '19:7', text: 'The wedding of the Lamb has come.', isTrue: true, explanation: 'Correct.' },
      { verse: '19:15', text: 'The rider judges with a reed of comfort only.', isTrue: false, explanation: 'He strikes down the nations with a sharp sword and rules with an iron scepter.' },
    ],
    builder: [
      { verse: '19:11', chunks: ['With justice', 'he judges', 'and makes war.'] },
      { verse: '19:16', chunks: ['King of kings', 'and Lord of lords'] },
    ],
  },
  millennium: {
    blanks: [
      { verse: '20:2', textBefore: 'He seized the dragon, that ancient serpent, who is the devil, or Satan, and bound him for a', blank: 'thousand', textAfter: 'years.', options: ['thousand', 'hundred', 'million', 'seven'] },
      { verse: '20:6', textBefore: 'Blessed and holy are those who have part in the first', blank: 'resurrection', textAfter: '.', options: ['resurrection', 'judgment', 'victory', 'harvest'] },
      { verse: '20:12', textBefore: 'The dead were judged according to what they had done as recorded in the', blank: 'books', textAfter: '.', options: ['books', 'scrolls', 'records', 'tablets'] },
    ],
    tf: [
      { verse: '20:10', text: 'The devil was thrown into the lake of burning sulfur.', isTrue: true, explanation: 'Correct.' },
      { verse: '20:14', text: 'Death and Hades were welcomed into the city of God.', isTrue: false, explanation: 'They were thrown into the lake of fire.' },
    ],
    builder: [
      { verse: '20:12', chunks: ['And I saw', 'the dead,', 'great and small,', 'standing before the throne.'] },
    ],
  },
  new_jerusalem: {
    blanks: [
      { verse: '21:2', textBefore: 'I saw the Holy City, the new', blank: 'Jerusalem', textAfter: ',', options: ['Jerusalem', 'creation', 'temple', 'kingdom'] },
      { verse: '21:4', textBefore: 'He will wipe every tear from their', blank: 'eyes', textAfter: '.', options: ['eyes', 'hearts', 'faces', 'souls'] },
      { verse: '21:21', textBefore: 'The twelve gates were twelve', blank: 'pearls', textAfter: '.', options: ['pearls', 'rubies', 'emeralds', 'diamonds'] },
    ],
    tf: [
      { verse: '21:3', text: 'God’s dwelling is now with men.', isTrue: true, explanation: 'Correct.' },
      { verse: '21:22', text: 'John saw a temple in the city.', isTrue: false, explanation: 'He did not see a temple in it.' },
    ],
    builder: [
      { verse: '21:4', chunks: ['There will be', 'no more death', 'or mourning', 'or crying', 'or pain.'] },
      { verse: '21:5', chunks: ['I am making', 'everything new!'] },
    ],
  },
  river: {
    blanks: [
      { verse: '22:1', textBefore: 'The river of the water of', blank: 'life', textAfter: 'was as clear as crystal.', options: ['life', 'glory', 'grace', 'peace'] },
      { verse: '22:2', textBefore: 'On each side of the river stood the tree of', blank: 'life', textAfter: '.', options: ['life', 'truth', 'heaven', 'blessing'] },
      { verse: '22:20', textBefore: 'Yes, I am coming', blank: 'soon', textAfter: '.', options: ['soon', 'quickly', 'now', 'again'] },
    ],
    tf: [
      { verse: '22:17', text: 'The Spirit and the bride say, “Come!”', isTrue: true, explanation: 'Correct.' },
      { verse: '22:18', text: 'Nothing happens to anyone who adds to the words of this prophecy.', isTrue: false, explanation: 'God will add to him the plagues described in the book.' },
    ],
    builder: [
      { verse: '22:17', chunks: ['The Spirit', 'and the bride', 'say,', 'Come!'] },
      { verse: '22:20', chunks: ['Amen.', 'Come,', 'Lord Jesus.'] },
    ],
  },
  deep_theology: {
    blanks: [
      { verse: 'General', textBefore: 'The number 144,000 is a multiple of', blank: '12', textAfter: ', symbolizing covenant fullness.', options: ['12', '7', '10', '3'] },
      { verse: 'General', textBefore: 'Seven in Revelation often symbolizes spiritual', blank: 'completeness', textAfter: '.', options: ['completeness', 'confusion', 'conflict', 'creation'] },
      { verse: 'General', textBefore: 'Babylon represents a global system in organized rebellion against', blank: 'God', textAfter: '.', options: ['God', 'Israel', 'Rome', 'angels'] },
    ],
    tf: [
      { verse: 'General', text: 'Revelation uses symbols without any Old Testament background.', isTrue: false, explanation: 'Its symbolism is heavily rooted in earlier Scripture.' },
      { verse: 'General', text: 'The Lamb and the Beast represent rival kingdoms and loyalties.', isTrue: true, explanation: 'Correct.' },
    ],
    builder: [
      { verse: 'General', chunks: ['Revelation reveals', 'Jesus Christ,', 'his victory,', 'and the end', 'of evil powers.'] },
    ],
  },
  greek_roots: {
    blanks: [
      { verse: 'Greek', textBefore: 'The Greek word for witness is', blank: 'martys', textAfter: '.', options: ['angelos', 'martys', 'logos', 'kratos'] },
      { verse: 'Greek', textBefore: 'Apokalypsis means an', blank: 'unveiling', textAfter: 'or revelation.', options: ['unveiling', 'ending', 'judgment', 'vision'] },
      { verse: 'Greek', textBefore: 'Amen carries the idea of certainty and', blank: 'truth', textAfter: '.', options: ['truth', 'mystery', 'warning', 'silence'] },
    ],
    tf: [
      { verse: 'Greek', text: 'The title Apocalypse means concealment.', isTrue: false, explanation: 'It means unveiling or disclosure.' },
      { verse: 'Greek', text: 'Martys eventually became associated with martyr because of faithful witness unto death.', isTrue: true, explanation: 'Correct.' },
    ],
    builder: [
      { verse: 'Greek', chunks: ['Apokalypsis means', 'an unveiling,', 'a revealing,', 'a disclosure.'] },
    ],
  },
};
