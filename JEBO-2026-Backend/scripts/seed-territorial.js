const knex = require('../src/config/knex');

const REGIONES = [
  {
    numero: 1,
    distritos: [
      {
        nombre: 'Berisso',
        codigo: '06098',
        localidades: [
          ['Barrio Banco Provincia', null],
          ['Barrio El Carmen Este', null],
          ['Barrio Universitario', null],
          ['Berisso', '1923'],
          ['Los Talas', '1923'],
          ['Villa Argüello', null],
          ['Villa Dolores', null],
          ['Villa Independencia', null],
          ['Villa Nueva', null],
          ['Villa Porteña', null],
          ['Villa Progreso', null],
          ['Villa San Carlos', null],
          ['Villa Zula', null],
        ],
      },
      {
        nombre: 'Brandsen',
        codigo: '06119',
        localidades: [
          ['Altamirano', '1986'],
          ['Barrio El Mirador', null],
          ['Barrio Las Golondrinas', '1983'],
          ['Barrio Las Plantaciones', null],
          ['Barrio Los Bosquecitos', null],
          ['Barrio Parque Las Acacias', null],
          ['Campos de Roca', null],
          ['Club de Campo Las Malvinas', null],
          ['Coronel Brandsen', '1980'],
          ['Gómez', '1983'],
          ['Jeppener', '1986'],
          ['Oliden', '1981'],
          ['Posada de los Lagos', null],
          ['Samborombón', '1985'],
        ],
      },
      {
        nombre: 'Ensenada',
        codigo: '06245',
        localidades: [
          ['Dique N° 1', null],
          ['Ensenada', '1925'],
          ['Isla Santiago', '1929'],
          ['Punta Lara', '1931'],
          ['Villa Catela', null],
        ],
      },
      {
        nombre: 'La Plata',
        codigo: '06441',
        localidades: [
          ['Abasto', '1903'],
          ['Altos de San Lorenzo', null],
          ['Ángel Etcheverry', '1901'],
          ['Arana', '1909'],
          ['Arturo Seguí', '1895'],
          ['Barrio El Carmen Oeste', null],
          ['Barrio Gambier', null],
          ['Barrio Las Malvinas', null],
          ['Barrio Las Quintas', null],
          ['City Bell', '1896'],
          ['Country Club El Rodeo', null],
          ['El Retiro', '1901'],
          ['Ignacio Correas', '1909'],
          ['Joaquín Gorina', '1896'],
          ['José Hernández', '1903'],
          ['José Melchor Romero', '1903'],
          ['La Cumbre', '1900'],
          ['La Plata', '1900'],
          ['Lisandro Olmos', '1901'],
          ['Lomas de Copello', null],
          ['Los Hornos', '1900'],
          ['Manuel B. Gonnet', '1897'],
          ['Martín García', null],
          ['Ringuelet', '1901'],
          ['Rufino de Elizalde', '1900'],
          ['Ruta Sol', null],
          ['San Carlos', '1900'],
          ['Tolosa', '1901'],
          ['Transradio', null],
          ['Villa Elisa', '1894'],
          ['Villa Elvira', '1900'],
          ['Villa Garibaldi', null],
          ['Villa Montoro', null],
          ['Villa Parque Sicardi', '1907'],
        ],
      },
      {
        nombre: 'Magdalena',
        codigo: '06505',
        localidades: [
          ['Atalaya', '1913'],
          ['General Mansilla', '1911'],
          ['Julio Arditi', '1913'],
          ['Los Naranjos', '1911'],
          ['Magdalena', '1913'],
          ['Roberto J. Payró', '1915'],
          ['Vieytes', '1915'],
        ],
      },
      {
        nombre: 'Punta Indio',
        codigo: '06655',
        localidades: [
          ['Alvarez Jonte', '1921'],
          ['Base Aeronaval Punta Indio', '1919'],
          ['La Viruta', '1917'],
          ['Pipinas', '1921'],
          ['Punta Indio', '1917'],
          ['Verónica', '1917'],
        ],
      },
    ],
  },
  {
    numero: 2,
    distritos: [
      {
        nombre: 'Avellaneda',
        codigo: '06035',
        localidades: [
          ['Área Reserva Cinturón Ecológico', null],
          ['Avellaneda', '1870'],
          ['Crucesita', '1870'],
          ['Dock Sud', '1871'],
          ['Gerli', '1870'],
          ['Piñeyro', '1870'],
          ['Sarandí', '1872'],
          ['Villa Domínico', '1874'],
          ['Wilde', '1875'],
        ],
      },
      {
        nombre: 'Lanús',
        codigo: '06434',
        localidades: [
          ['Gerli', '1824'],
          ['Lanús', '1824'],
          ['Lanús Este', '1824'],
          ['Lanús Oeste', '1824'],
          ['Monte Chingolo', '1825'],
          ['Remedios de Escalada de San Martín', '1826'],
          ['Valentín Alsina', '1822'],
        ],
      },
      {
        nombre: 'Lomas de Zamora',
        codigo: '06490',
        localidades: [
          ['Banfield', '1828'],
          ['Llavallol', '1836'],
          ['Lomas de Zamora', '1832'],
          ['Temperley', '1834'],
          ['Turdera', '1834'],
          ['Villa Centenario', '1828'],
          ['Villa Fiorito', '1828'],
        ],
      },
    ],
  },
  {
    numero: 3,
    distritos: [
      {
        nombre: 'La Matanza',
        codigo: '06427',
        localidades: [
          ['20 de Junio', '1761'],
          ['Aldo Bonzi', '1770'],
          ['Ciudad Celina', '1772'],
          ['Ciudad Evita', '1778'],
          ['González Catán', '1759'],
          ['Gregorio de Laferrere', '1757'],
          ['Isidro Casanova', '1765'],
          ['La Tablada', '1766'],
          ['Lomas del Mirador', '1752'],
          ['Rafael Castillo', '1755'],
          ['Ramos Mejía', '1704'],
          ['San Justo', '1754'],
          ['Tapiales', '1770'],
          ['Villa Eduardo Madero', '1768'],
          ['Villa Luzuriaga', '1754'],
          ['Virrey del Pino', '1763'],
        ],
      },
    ],
  },
  {
    numero: 4,
    distritos: [
      {
        nombre: 'Berazategui',
        codigo: '06091',
        localidades: [
          ['Berazategui', '1884'],
          ['Berazategui Oeste', '1884'],
          ['Carlos Tomás Sourigues', '1885'],
          ['El Pato', null],
          ['Guillermo Enrique Hudson', '1885'],
          ['Juan María Gutiérrez', '1890'],
          ['Pereyra', '1894'],
          ['Plátanos', '1885'],
          ['Ranelagh', '1886'],
          ['Villa España', '1884'],
        ],
      },
      {
        nombre: 'Florencio Varela',
        codigo: '06274',
        localidades: [
          ['Bosques', '1889'],
          ['El Tropezón', '1888'],
          ['Estanislao Severo Zeballos', '1888'],
          ['Florencio Varela', '1888'],
          ['Gobernador Julio A. Costa', '1888'],
          ['Ingeniero Juan Allan', '1891'],
          ['La Capilla', '1888'],
          ['San Juan Bautista', null],
          ['Villa Brown', '1888'],
          ['Villa San Luis', '1888'],
          ['Villa Santa Rosa', '1888'],
          ['Villa Vatteone', '1888'],
        ],
      },
      {
        nombre: 'Quilmes',
        codigo: '06658',
        localidades: [
          ['Bernal', '1876'],
          ['Bernal Oeste', '1876'],
          ['Don Bosco', '1876'],
          ['Ezpeleta', '1882'],
          ['Ezpeleta Oeste', '1882'],
          ['Quilmes', '1878'],
          ['Quilmes Oeste', '1879'],
          ['San Francisco Solano', '1881'],
          ['Villa La Florida', '1881'],
        ],
      },
    ],
  },
  {
    numero: 5,
    distritos: [
      {
        nombre: 'Almirante Brown',
        codigo: '06028',
        localidades: [
          ['Adrogué', '1846'],
          ['Almirante Brown', '1846'],
          ['Burzaco', '1852'],
          ['Claypole', '1849'],
          ['Don Orione', null],
          ['Glew', '1856'],
          ['José Mármol', '1846'],
          ['Longchamps', '1854'],
          ['Malvinas Argentinas', '1846'],
          ['Ministro Rivadavia', '1852'],
          ['Rafael Calzada', '1847'],
          ['San Francisco Solano', '1846'],
          ['San José', '1846'],
        ],
      },
      {
        nombre: 'Esteban Echeverría',
        codigo: '06260',
        localidades: [
          ['9 de Abril', '1776'],
          ['Canning', '1804'],
          ['El Jagüel', '1842'],
          ['Luis Guillón', '1838'],
          ['Monte Grande', '1842'],
        ],
      },
      {
        nombre: 'Ezeiza',
        codigo: '06270',
        localidades: [
          ['Aeropuerto Internacional Ezeiza', '1802'],
          ['Canning', '1804'],
          ['Carlos Spegazzini', '1812'],
          ['Ezeiza', '1804'],
          ['La Unión', '1804'],
          ['Tristán Suárez', '1806'],
        ],
      },
      {
        nombre: 'Presidente Perón',
        codigo: '06648',
        localidades: [
          ['Barrio América Unida', '1862'],
          ['Guernica', '1862'],
        ],
      },
      {
        nombre: 'San Vicente',
        codigo: '06778',
        localidades: [
          ['Alejandro Korn', '1864'],
          ['Domselaar', '1984'],
          ['San Vicente', '1865'],
        ],
      },
    ],
  },
  {
    numero: 6,
    distritos: [
      {
        nombre: 'San Fernando',
        codigo: '06749',
        localidades: [
          ['San Fernando', '1646'],
          ['Victoria', '1644'],
          ['Virreyes', '1646'],
        ],
      },
      {
        nombre: 'San Isidro',
        codigo: '06756',
        localidades: [
          ['Acassuso', '1640'],
          ['Béccar', '1643'],
          ['Boulogne Sur Mer', '1609'],
          ['Martínez', '1640'],
          ['San Isidro', '1642'],
          ['Villa Adelina', '1607'],
        ],
      },
      {
        nombre: 'Tigre',
        codigo: '06805',
        localidades: [
          ['Benavídez', '1621'],
          ['Dique Luján', '1623'],
          ['Don Torcuato', '1611'],
          ['Don Torcuato Este', '1611'],
          ['Don Torcuato Oeste', '1611'],
          ['El Talar', '1617'],
          ['General Pacheco', '1617'],
          ['Ricardo Rojas', '1618'],
          ['Rincón de Milberg', '1648'],
          ['Tigre', '1648'],
          ['Troncos del Talar', '1618'],
        ],
      },
      {
        nombre: 'Vicente López',
        codigo: '06861',
        localidades: [
          ['Carapachay', '1605'],
          ['Florida', '1602'],
          ['Florida Oeste', '1602'],
          ['La Lucila', '1636'],
          ['Munro', '1605'],
          ['Olivos', '1636'],
          ['Vicente López', '1638'],
          ['Villa Adelina', '1605'],
          ['Villa Martelli', '1603'],
        ],
      },
    ],
  },
  {
    numero: 7,
    distritos: [
      {
        nombre: 'General San Martín',
        codigo: '06371',
        localidades: [
          ['Barrio Parque General San Martín', null],
          ['Billinghurst', '1650'],
          ['Ciudad Jardín El Libertador', '1655'],
          ['General San Martín', '1650'],
          ['Loma Hermosa', '1657'],
          ['Va.María Irene de los Remedios Escalada', '1655'],
          ['Va.Marqués Alejandro María de Aguado', '1651'],
          ['Villa Ayacucho', '1650'],
          ['Villa Ballester', '1653'],
          ['Villa Bernardo Monteagudo', '1650'],
          ['Villa Chacabuco', '1650'],
          ['Villa Coronel José M. Zapiola', '1653'],
          ['Villa General Antonio J. de Sucre', '1653'],
          ['Villa General Eugenio Necochea', '1655'],
          ['Villa General José Tomás Guido', '1653'],
          ['Villa General Juan G. Las Heras', '1653'],
          ['Villa Godoy Cruz', '1653'],
          ['Villa Granaderos de San Martín', '1651'],
          ['Villa Gregoria Matorras', '1653'],
          ['Villa José León Suárez', '1655'],
          ['Villa Juan Martín de Pueyrredón', '1650'],
          ['Villa Libertad', '1650'],
          ['Villa Lynch', '1672'],
          ['Villa Maipú', '1650'],
          ['Villa Parque Presidente Figueroa Alcorta', '1672'],
          ['Villa Parque San Lorenzo', '1651'],
          ['Villa San Andrés', '1651'],
          ['Villa Yapeyú', '1651'],
        ],
      },
      {
        nombre: 'Hurlingham',
        codigo: '06408',
        localidades: [
          ['Hurlingham', '1686'],
          ['Villa Santos Tesei', '1688'],
          ['William C. Morris', '1686'],
        ],
      },
      {
        nombre: 'Tres de Febrero',
        codigo: '06840',
        localidades: [
          ['11 de Septiembre', '1657'],
          ['Caseros', '1678'],
          ['Churruca', '1657'],
          ['Ciudad Jardín Lomas del Palomar', '1684'],
          ['Ciudadela', '1702'],
          ['El Libertador', '1657'],
          ['José Ingenieros', '1702'],
          ['Loma Hermosa', '1657'],
          ['Martín Coronado', '1682'],
          ['Pablo Podestá', '1657'],
          ['Remedios de Escalada', '1657'],
          ['Sáenz Peña', '1674'],
          ['Santos Lugares', '1676'],
          ['Villa Bosch', '1682'],
          ['Villa Raffo', '1674'],
        ],
      },
    ],
  },
  {
    numero: 8,
    distritos: [
      {
        nombre: 'Ituzaingó',
        codigo: '06410',
        localidades: [
          ['Ituzaingó', '1714'],
          ['Ituzaingó Centro', '1714'],
          ['Ituzaingó Sur', '1714'],
          ['Villa Gobernador Udaondo', '1713'],
        ],
      },
      {
        nombre: 'Merlo',
        codigo: '06539',
        localidades: [
          ['Libertad', '1716'],
          ['Mariano Acosta', '1723'],
          ['Merlo', '1722'],
          ['Parque San Martín', '1722'],
          ['Pontevedra', '1761'],
          ['San Antonio de Padua', '1718'],
        ],
      },
      {
        nombre: 'Morón',
        codigo: '06568',
        localidades: [
          ['Castelar', '1712'],
          ['El Palomar', '1684'],
          ['Haedo', '1706'],
          ['Morón', '1708'],
          ['Villa Sarmiento', '1706'],
        ],
      },
    ],
  },
  {
    numero: 9,
    distritos: [
      {
        nombre: 'José C. Paz',
        codigo: '06412',
        localidades: [
          ['Del Viso', '1669'],
          ['José C. Paz', '1665'],
          ['Tortuguitas', '1667'],
        ],
      },
      {
        nombre: 'Malvinas Argentinas',
        codigo: '06515',
        localidades: [
          ['Área de Promoción El Triángulo', null],
          ['Grand Bourg', '1615'],
          ['Ingeniero Adolfo Sourdeaux', '1612'],
          ['Ingeniero Pablo Nogués', '1613'],
          ['Los Polvorines', '1613'],
          ['Malvinas Argentinas', '1613'],
          ['Tierras Altas', '1615'],
          ['Tortuguitas', '1667'],
          ['Villa de Mayo', '1614'],
        ],
      },
      {
        nombre: 'Moreno',
        codigo: '06560',
        localidades: [
          ['Cuartel V', '1744'],
          ['Francisco Álvarez', '1746'],
          ['La Reja', '1744'],
          ['Moreno', '1744'],
          ['Paso del Rey', '1742'],
          ['Trujui', '1664'],
        ],
      },
      {
        nombre: 'San Miguel',
        codigo: '06760',
        localidades: [
          ['Bella Vista', '1661'],
          ['Campo de Mayo', '1659'],
          ['Muñiz', '1663'],
          ['San Miguel', '1663'],
          ['Santa María', '1663'],
        ],
      },
    ],
  },
  {
    numero: 10,
    distritos: [
      {
        nombre: 'Cañuelas',
        codigo: '06134',
        localidades: [
          ['Alejandro Petión', '1808'],
          ['Barrio Belgrano', null],
          ['Barrio El Taladro', '1814'],
          ['Barrio San Esteban - Barrio Los Pozos', null],
          ['Cañuelas', '1814'],
          ['Chacras de la Trinidad', null],
          ['Gobernador Udaondo', '7221'],
          ['Máximo Paz', '1812'],
          ['Santa Rosa', '1739'],
          ['Uribelarrea', '1815'],
          ['Vicente Casares', '1808'],
        ],
      },
      {
        nombre: 'General Las Heras',
        codigo: '06329',
        localidades: [
          ['General Hornos', '1739'],
          ['General Las Heras', '1741'],
          ['La Choza', '1737'],
          ['Plomer', '1741'],
          ['Villars', '1731'],
        ],
      },
      {
        nombre: 'General Rodríguez',
        codigo: '06364',
        localidades: [
          ['Barrio Morabo', null],
          ['Barrio Ruta 24 Kilómetro 10', null],
          ['Country Club Bosque Real', null],
          ['General Rodríguez', '1748'],
        ],
      },
      {
        nombre: 'Luján',
        codigo: '06497',
        localidades: [
          ['Barrio Las Casuarinas', null],
          ['Carlos Keen', '6701'],
          ['Club de Campo Los Puentes', null],
          ['Cortines', '6712'],
          ['Country Club Las Praderas', null],
          ['Jáuregui', '6706'],
          ['La Catalina', null],
          ['Lezica y Torrezuri', '6700'],
          ['Loma Escondida', null],
          ['Luján', '6700'],
          ['Olivera', '6608'],
          ['Open Door', '6708'],
          ['Torres', '6703'],
          ['Villa Flandria Norte', null],
          ['Villa Flandria Sur', null],
        ],
      },
      {
        nombre: 'Marcos Paz',
        codigo: '06525',
        localidades: [
          ['Barrio Lisandro de la Torre y Santa Marta', null],
          ['Barrio Santa Rosa', '1727'],
          ['Marcos Paz', '1727'],
        ],
      },
      {
        nombre: 'Mercedes',
        codigo: '06532',
        localidades: [
          ['Goldney', '6614'],
          ['Gowland', '6608'],
          ['Jorge Born', null],
          ['Mercedes', '6600'],
          ['Tomás Jofré', '6601'],
        ],
      },
      {
        nombre: 'Navarro',
        codigo: '06574',
        localidades: [
          ['José Juan Almeyra', '6603'],
          ['Las Marianas', '6607'],
          ['Navarro', '6605'],
          ['Villa Moll', '6627'],
        ],
      },
      {
        nombre: 'San Andrés de Giles',
        codigo: '06728',
        localidades: [
          ['Azcuénaga', '6721'],
          ['Chacras de Villa Espil', null],
          ['Cucullú', '6723'],
          ['Franklin', '6614'],
          ['San Andrés de Giles', '6720'],
          ['Solís', '2764'],
          ['Villa Espil', '6712'],
          ['Villa Ruiz', '6705'],
        ],
      },
      {
        nombre: 'Suipacha',
        codigo: '06784',
        localidades: [
          ['General Rivas', '6614'],
          ['Suipacha', '6612'],
        ],
      },
    ],
  },
  {
    numero: 11,
    distritos: [
      {
        nombre: 'Campana',
        codigo: '06126',
        localidades: [
          ['Barrio Los Pioneros (Barrio Tavella)', null],
          ['Campana', '2804'],
          ['Chacras del Río Luján', null],
          ['Los Cardales', '2814'],
          ['Río Luján', '2802'],
        ],
      },
      {
        nombre: 'Escobar',
        codigo: '06252',
        localidades: [
          ['Belén de Escobar', '1625'],
          ['El Cazador', null],
          ['Garín', '1619'],
          ['Ingeniero Maschwitz', '1623'],
          ['Loma Verde', '1625'],
          ['Maquinista F. Savio Este', '1620'],
          ['Matheu', '1627'],
        ],
      },
      {
        nombre: 'Exaltación de la Cruz',
        codigo: '06266',
        localidades: [
          ['Arroyo de la Cruz', '2813'],
          ['Capilla del Señor', '2812'],
          ['Diego Gaynor', '2812'],
          ['El Chajá', null],
          ['El Malacate', null],
          ['El Remanso', '2812'],
          ['La Macarena', null],
          ['Las Vizcachas', null],
          ['Los Cardales', '2814'],
          ['Parada Orlando', '2812'],
          ['Parada Robles', '6703'],
          ['Pavón', '2815'],
          ['Torres', null],
        ],
      },
      {
        nombre: 'Pilar',
        codigo: '06638',
        localidades: [
          ['Del Viso', '1669'],
          ['Fátima', '1633'],
          ['La Lonja', '1669'],
          ['Los Cachorros', null],
          ['Manuel Alberti', '1667'],
          ['Manzanares', '1629'],
          ['Manzone', '1633'],
          ['Maquinista F. Savio Oeste', null],
          ['Pilar', '1629'],
          ['Presidente Derqui', '1635'],
          ['Roberto de Vicenzo', null],
          ['Santa Teresa', null],
          ['Tortuguitas', '1667'],
          ['Villa Astolfi', '1633'],
          ['Villa Rosa', '1631'],
          ['Zelaya', '1627'],
        ],
      },
      {
        nombre: 'Zárate',
        codigo: '06882',
        localidades: [
          ['Barrio El Mangrullo', null],
          ['Barrio Saavedra', null],
          ['Chacras de Olivia', null],
          ['Chacras del Paraná', null],
          ['Country Club El Casco', null],
          ['Escalada', '2801'],
          ['Lima', '2806'],
          ['Puente Urquiza', null],
          ['Puerto Panal', '2800'],
          ['Zárate', '2800'],
        ],
      },
    ],
  },
  {
    numero: 12,
    distritos: [
      {
        nombre: 'Arrecifes',
        codigo: '06077',
        localidades: [
          ['Arrecifes', '2740'],
          ['Todd', '2754'],
          ['Viña', '2754'],
        ],
      },
      {
        nombre: 'Baradero',
        codigo: '06070',
        localidades: [
          ['Baradero', '2942'],
          ['Irineo Portela', '2943'],
          ['Quebradas', null],
          ['Santa Coloma', '2761'],
          ['Villa Alsina', '2938'],
        ],
      },
      {
        nombre: 'Capitán Sarmiento',
        codigo: '06140',
        localidades: [
          ['Capitán Sarmiento', '2752'],
          ['La Luisa', '2752'],
        ],
      },
      {
        nombre: 'Ramallo',
        codigo: '06665',
        localidades: [
          ['El Paraíso', '2916'],
          ['Las Bahamas', '2916'],
          ['Pérez Millán', '2933'],
          ['Ramallo', '2915'],
          ['Villa General Savio', '2912'],
          ['Villa Ramallo', '2914'],
        ],
      },
      {
        nombre: 'San Nicolás',
        codigo: '06763',
        localidades: [
          ['Campos Salles', '2900'],
          ['Conesa', '2907'],
          ['Erezcano', '2903'],
          ['General Rojo', '2905'],
          ['La Emilia', '2901'],
          ['San Nicolás de los Arroyos', '2900'],
          ['Villa Campi', null],
          ['Villa Canto', null],
          ['Villa Esperanza', null],
          ['Villa Riccio', null],
        ],
      },
      {
        nombre: 'San Pedro',
        codigo: '06770',
        localidades: [
          ['Gobernador Castro', '2946'],
          ['Ingeniero Moneta', '2935'],
          ['Obligado', null],
          ['Pueblo Doyle', '2935'],
          ['Río Tala', '2944'],
          ['San Pedro', '2930'],
          ['Santa Lucía', '2935'],
        ],
      },
    ],
  },
  {
    numero: 13,
    distritos: [
      {
        nombre: 'Carmen de Areco',
        codigo: '06161',
        localidades: [
          ['Carmen de Areco', '6725'],
          ['Pueblo Gouin', '6727'],
          ['Tres Sargentos', '6727'],
        ],
      },
      {
        nombre: 'Colón',
        codigo: '06175',
        localidades: [
          ['Colón', '2720'],
          ['El Arbolito', '2721'],
          ['Pearson', '2711'],
          ['Sarasa', '2721'],
          ['Villa Manuel Pomar', '2721'],
        ],
      },
      {
        nombre: 'Pergamino',
        codigo: '06623',
        localidades: [
          ['Acevedo', '2717'],
          ['Fontezuela', '2718'],
          ['Guerrico', '2717'],
          ['Juan A. de la Peña', '2717'],
          ['Juan Anchorena', '2718'],
          ['La Violeta', '2751'],
          ['Manuel Ocampo', '2713'],
          ['Mariano Benítez', '2701'],
          ['Mariano H. Alfonzo', '2718'],
          ['Pergamino', '2700'],
          ['Pinzón', '2703'],
          ['Rancagua', '2701'],
          ['Villa Angélica', '2715'],
          ['Villa San José', '2743'],
        ],
      },
      {
        nombre: 'Rojas',
        codigo: '06686',
        localidades: [
          ['Barrio Las Margaritas', null],
          ['La Beba', '6003'],
          ['Las Carabelas', '2703'],
          ['Los Indios', '2709'],
          ['Rafael Obligado', '6001'],
          ['Roberto Cano', '2703'],
          ['Rojas', '2705'],
          ['Sol de Mayo', '2709'],
          ['Villa Manuel Pomar', '2721'],
          ['Villa Parque Cecir', '2705'],
        ],
      },
      {
        nombre: 'Salto',
        codigo: '06714',
        localidades: [
          ['Arroyo Dulce', '2743'],
          ['Berdier', '2743'],
          ['Gahan', '2745'],
          ['Inés Indart', '2747'],
          ['La Invencible', '2745'],
          ['Salto', '2741'],
        ],
      },
      {
        nombre: 'San Antonio de Areco',
        codigo: '06735',
        localidades: [
          ['Duggan', '2764'],
          ['San Antonio de Areco', '2760'],
          ['Vagues', '2764'],
          ['Villa Lía', '2761'],
        ],
      },
    ],
  },
  {
    numero: 14,
    distritos: [
      {
        nombre: 'Chacabuco',
        codigo: '06210',
        localidades: [
          ['Castilla', '6616'],
          ['Chacabuco', '6740'],
          ['Los Angeles', '2743'],
          ['O\'Higgins', '6748'],
          ['Rawson', '6734'],
        ],
      },
      {
        nombre: 'Florentino Ameghino',
        codigo: '06277',
        localidades: [
          ['Blaquier', '6065'],
          ['Florentino Ameghino', '6064'],
          ['Porvenir', '6063'],
        ],
      },
      {
        nombre: 'General Arenales',
        codigo: '06294',
        localidades: [
          ['Arribeños', '6007'],
          ['Ascensión', '6003'],
          ['Estación Arenales', '6005'],
          ['Ferré', '6003'],
          ['General Arenales', '6005'],
          ['La Angelita', '6003'],
          ['La Trinidad', '6003'],
        ],
      },
      {
        nombre: 'General Pinto',
        codigo: '06351',
        localidades: [
          ['Colonia San Ricardo', '6042'],
          ['General Pinto', '6050'],
          ['Germania', '6053'],
          ['Gunther', '6053'],
          ['Villa Francia', '6062'],
          ['Villa Roth', '6051'],
        ],
      },
      {
        nombre: 'General Viamonte',
        codigo: '06385',
        localidades: [
          ['Baigorrita', '6013'],
          ['La Delfina', '6017'],
          ['Los Toldos', '6015'],
          ['San Emilio', '6017'],
          ['Zavalía', '6018'],
        ],
      },
      {
        nombre: 'Junín',
        codigo: '06413',
        localidades: [
          ['Agustín Roca', '6001'],
          ['Agustina', '6001'],
          ['Balneario Laguna de Gómez', '6001'],
          ['Fortín Tiburcio', '6001'],
          ['Junín', '6000'],
          ['Laplacette', '6013'],
          ['Morse', '6013'],
          ['Paraje La Agraria', '6000'],
          ['Saforcada', '6022'],
        ],
      },
      {
        nombre: 'Leandro N. Alem',
        codigo: '06462',
        localidades: [
          ['Alberdi Viejo', '6034'],
          ['El Dorado', '6031'],
          ['Fortín Acha', '6031'],
          ['Juan Bautista Alberdi', '6034'],
          ['Leandro N. Alem', '6032'],
          ['Vedia', '6030'],
        ],
      },
      {
        nombre: 'Lincoln',
        codigo: '06469',
        localidades: [
          ['Arenaza', '6075'],
          ['Bayauca', '6078'],
          ['Bermúdez', '6071'],
          ['Carlos Salas', '6453'],
          ['Coronel Martínez de Hoz', '6533'],
          ['El Triunfo', '6073'],
          ['Las Toscas', '6453'],
          ['Lincoln', '6070'],
          ['Pasteur', '6077'],
          ['Roberts', '6075'],
          ['Triunvirato', '6071'],
        ],
      },
    ],
  },
  {
    numero: 15,
    distritos: [
      {
        nombre: '9 de Julio',
        codigo: '06588',
        localidades: [
          ['12 de Octubre', '6501'],
          ['9 de Julio', '6500'],
          ['Alfredo Demarchi', '6533'],
          ['Carlos María Naón', '6515'],
          ['Dudignac', '6505'],
          ['La Aurora', '6513'],
          ['Manuel B. Gonnet', '6516'],
          ['Marcelino Ugarte', '6516'],
          ['Morea', '6507'],
          ['Norumbega', '6501'],
          ['Patricios', '6503'],
          ['Villa Fournier', '6501'],
        ],
      },
      {
        nombre: 'Alberti',
        codigo: '06021',
        localidades: [
          ['Alberti', '6634'],
          ['Coronel Seguí', '6628'],
          ['Mechita', '6648'],
          ['Pla', '6634'],
          ['Villa Grisolía', '6627'],
          ['Villa María', '6628'],
          ['Villa Ortiz', '6629'],
        ],
      },
      {
        nombre: 'Bragado',
        codigo: '06112',
        localidades: [
          ['Asamblea', '6640'],
          ['Bragado', '6640'],
          ['Comodoro Py', '6641'],
          ['Eduardo O\'Brien', null],
          ['General O\'Brien', '6646'],
          ['Irala', '6013'],
          ['Juan F. Salaberry', null],
          ['La Limpia', '6645'],
          ['Mechita', '6648'],
          ['Olascoaga', '6652'],
          ['Warnes', '6646'],
        ],
      },
      {
        nombre: 'Carlos Casares',
        codigo: '06147',
        localidades: [
          ['Bellocq', '6535'],
          ['Cadret', '6535'],
          ['Carlos Casares', '6530'],
          ['Colonia Mauricio', '6531'],
          ['Hortensia', '6537'],
          ['La Sofía', '6535'],
          ['Mauricio Hirsch', '6531'],
          ['Moctezuma', '6531'],
          ['Ordoqui', '6537'],
          ['Santo Tomás', '6530'],
          ['Smith', '6531'],
        ],
      },
      {
        nombre: 'Chivilcoy',
        codigo: '06224',
        localidades: [
          ['Benitez', '6632'],
          ['Chivilcoy', '6620'],
          ['Emilio Ayarza', '6628'],
          ['Gorostiaga', '6632'],
          ['La Rica', '6623'],
          ['Moquehuá', '6625'],
          ['Palemón Huergo', '6628'],
          ['Ramón Biaus', '6627'],
          ['San Sebastián', '6623'],
        ],
      },
      {
        nombre: 'Hipólito Yrigoyen',
        codigo: '06406',
        localidades: [
          ['Henderson', '6465'],
          ['Herrera Vegas', '6557'],
        ],
      },
      {
        nombre: 'Pehuajó',
        codigo: '06609',
        localidades: [
          ['Capitán Castro', '6461'],
          ['Chiclana', '6476'],
          ['Francisco Madero', '6472'],
          ['Inocencio Sosa', '6451'],
          ['Juan José Paso', '6474'],
          ['Magdala', '6451'],
          ['Mones Cazón', '6469'],
          ['Nueva Plata', '6451'],
          ['Pehuajó', '6450'],
          ['San Bernardo', '6476'],
          ['San Esteban', '6450'],
        ],
      },
    ],
  },
  {
    numero: 16,
    distritos: [
      {
        nombre: 'Carlos Tejedor',
        codigo: '06154',
        localidades: [
          ['Carlos Tejedor', '6455'],
          ['Colonia Seré', '6459'],
          ['Curarú', '6451'],
          ['Timote', '6457'],
          ['Tres Algarrobos', '6231'],
        ],
      },
      {
        nombre: 'General Villegas',
        codigo: '06392',
        localidades: [
          ['Banderaló', '6244'],
          ['Cañada Seca', '6105'],
          ['Coronel Charlone', '6223'],
          ['Emilio V. Bunge', '6241'],
          ['General Villegas', '6230'],
          ['Massey', '6242'],
          ['Pichincha', '6051'],
          ['Piedritas', '6241'],
          ['Santa Eleodora', '6241'],
          ['Santa Regina', '6105'],
          ['Villa Saboya', '6101'],
          ['Villa Sauze', '6235'],
        ],
      },
      {
        nombre: 'Pellegrini',
        codigo: '06616',
        localidades: [
          ['Bocayuva', '6348'],
          ['De Bary', '6348'],
          ['Pellegrini', '6346'],
        ],
      },
      {
        nombre: 'Rivadavia',
        codigo: '06679',
        localidades: [
          ['América', '6237'],
          ['Fortín Olavarría', '6403'],
          ['González Moreno', '6239'],
          ['Mira Pampa', '6403'],
          ['Roosevelt', '6403'],
          ['San Mauricio', '6239'],
          ['Sansinena', '6233'],
          ['Sundblad', '6401'],
        ],
      },
      {
        nombre: 'Salliqueló',
        codigo: '06721',
        localidades: [
          ['Quenumá', '6335'],
          ['Salliqueló', '6339'],
        ],
      },
      {
        nombre: 'Trenque Lauquen',
        codigo: '06826',
        localidades: [
          ['30 de Agosto', '6405'],
          ['Berutti', '6424'],
          ['Garré Norte', null],
          ['Girodias', '6407'],
          ['La Carreta', '6471'],
          ['Trenque Lauquen', '6400'],
          ['Trongé', '6407'],
        ],
      },
      {
        nombre: 'Tres Lomas',
        codigo: '06847',
        localidades: [
          ['Ingeniero Thompson', '6337'],
          ['Tres Lomas', '6409'],
        ],
      },
    ],
  },
  {
    numero: 17,
    distritos: [
      {
        nombre: 'Chascomús',
        codigo: '06218',
        localidades: [
          ['Adela', '7136'],
          ['Barrio Lomas Altas', null],
          ['Barrio San Cayetano', null],
          ['Chascomús', '7130'],
          ['Don Cipriano', '7135'],
          ['Laguna Vitel', '7130'],
          ['Villa Parque Girado', null],
        ],
      },
      {
        nombre: 'General Belgrano',
        codigo: '06301',
        localidades: [
          ['Chas', '7223'],
          ['General Belgrano', '7223'],
          ['Gorchs', '7226'],
        ],
      },
      {
        nombre: 'General Paz',
        codigo: '06343',
        localidades: [
          ['Barrio Río Salado', '7227'],
          ['Loma Verde', '1981'],
          ['Ranchos', '1987'],
          ['Villanueva', '7225'],
        ],
      },
      {
        nombre: 'Lezama',
        codigo: '06466',
        localidades: [
          ['El Destino', '7116'],
          ['Lezama', '7116'],
          ['Monasterio', '7136'],
        ],
      },
      {
        nombre: 'Monte',
        codigo: '06547',
        localidades: [
          ['Abbott', '7228'],
          ['Francisco A. Berra', '7221'],
          ['San Miguel del Monte', '7220'],
          ['Zenón Videla Dorna', '7226'],
        ],
      },
      {
        nombre: 'Pila',
        codigo: '06630',
        localidades: [
          ['Casalins', '7225'],
          ['Pila', '7116'],
        ],
      },
      {
        nombre: 'Rauch',
        codigo: '06672',
        localidades: [
          ['Martín Colman', '7201'],
          ['Miranda', '7201'],
          ['Rauch', '7203'],
        ],
      },
    ],
  },
  {
    numero: 18,
    distritos: [
      {
        nombre: 'Ayacucho',
        codigo: '06042',
        localidades: [
          ['Ayacucho', '7150'],
          ['La Constancia', '7153'],
          ['Solanet', '7151'],
          ['Udaquiola', '7151'],
        ],
      },
      {
        nombre: 'Castelli',
        codigo: '06168',
        localidades: [
          ['Castelli', '7114'],
          ['Centro Guerrero', '7114'],
          ['Cerro de la Gloria', '7114'],
        ],
      },
      {
        nombre: 'Dolores',
        codigo: '06238',
        localidades: [
          ['Dolores', '7100'],
          ['Sevigne', '7101'],
        ],
      },
      {
        nombre: 'General Guido',
        codigo: '06308',
        localidades: [
          ['General Guido', '7118'],
          ['Labardén', '7161'],
        ],
      },
      {
        nombre: 'General Juan Madariaga',
        codigo: '06315',
        localidades: [
          ['Barrio Kennedy', null],
          ['Divisadero', null],
          ['General Juan Madariaga', '7163'],
        ],
      },
      {
        nombre: 'General Lavalle',
        codigo: '06336',
        localidades: [
          ['General Lavalle', '7103'],
          ['Pavón', '7109'],
        ],
      },
      {
        nombre: 'La Costa',
        codigo: '06420',
        localidades: [
          ['Aguas Verdes', '7112'],
          ['Costa Azul', '7112'],
          ['Costa del Este', '7108'],
          ['Costa Esmeralda', '7109'],
          ['Las Toninas', '7106'],
          ['Lucila del Mar', '7113'],
          ['Mar de Ajó', '7109'],
          ['Mar de Ajó Norte', '7109'],
          ['Mar del Tuyú', '7108'],
          ['Nueva Atlantis', '7113'],
          ['Punta Médanos', '7109'],
          ['San Bernardo', '7111'],
          ['San Clemente del Tuyú', '7105'],
          ['Santa Teresita', '7107'],
          ['Villa Robles', '7109'],
        ],
      },
      {
        nombre: 'Maipú',
        codigo: '06511',
        localidades: [
          ['Las Armas', '7172'],
          ['Maipú', '7160'],
          ['Santo Domingo', '7118'],
        ],
      },
      {
        nombre: 'Pinamar',
        codigo: '06644',
        localidades: [
          ['Cariló', '7167'],
          ['Montecarlo', '7167'],
          ['Ostende', '7167'],
          ['Pinamar', '7167'],
          ['Valeria del Mar', '7167'],
        ],
      },
      {
        nombre: 'Tordillo',
        codigo: '06812',
        localidades: [
          ['General Conesa', '7101'],
          ['Villa Roch', '7101'],
        ],
      },
      {
        nombre: 'Villa Gesell',
        codigo: '06868',
        localidades: [
          ['El Salvaje', null],
          ['Las Gaviotas', null],
          ['Mar Azul', '7165'],
          ['Mar de las Pampas', '7165'],
          ['Villa Gesell', '7165'],
        ],
      },
    ],
  },
  {
    numero: 19,
    distritos: [
      {
        nombre: 'General Alvarado',
        codigo: '06280',
        localidades: [
          ['Centinela del Mar', '7607'],
          ['Comandante Nicanor Otamendi', '7603'],
          ['Mar del Sur', '7607'],
          ['Mechongué', '7605'],
          ['Miramar', '7607'],
        ],
      },
      {
        nombre: 'General Pueyrredón',
        codigo: '06357',
        localidades: [
          ['Barrio Colinas Verdes', null],
          ['Barrio El Boquerón', '7601'],
          ['Barrio El Casal', null],
          ['Barrio El Coyunco', null],
          ['Barrio La Gloria', null],
          ['Barrio Santa Paula', null],
          ['Batán', '7601'],
          ['Camet', '7612'],
          ['Chapadmalal', '7605'],
          ['El Marquesado', '7607'],
          ['Estación Camet', '7612'],
          ['Estación Chapadmalal', '7605'],
          ['Mar del Plata', '7600'],
          ['Punta Mogotes', '7600'],
          ['Sierra de los Padres', '7601'],
        ],
      },
      {
        nombre: 'Mar Chiquita',
        codigo: '06518',
        localidades: [
          ['Atlántida', '7607'],
          ['Camet Norte', '7607'],
          ['Coronel Vidal', '7174'],
          ['Frente Mar', '7607'],
          ['General Pirán', '7172'],
          ['La Armonía', '7612'],
          ['La Baliza', '7607'],
          ['La Caleta', '7609'],
          ['Mar Chiquita', '7609'],
          ['Mar de Cobo', '7609'],
          ['Playa Dorada', '7607'],
          ['Santa Clara del Mar', '7609'],
          ['Santa Elena', '7609'],
          ['Vivoratá', '7612'],
        ],
      },
    ],
  },
  {
    numero: 20,
    distritos: [
      {
        nombre: 'Balcarce',
        codigo: '06063',
        localidades: [
          ['Balcarce', '7620'],
          ['Los Pinos', '7623'],
          ['Napaleofú', '7007'],
          ['Ramos Otero', '7621'],
          ['San Agustín', '7623'],
          ['Villa Laguna La Brava', '7620'],
        ],
      },
      {
        nombre: 'Lobería',
        codigo: '06476',
        localidades: [
          ['Arenas Verdes', '7631'],
          ['Licenciado Matienzo', '7007'],
          ['Lobería', '7635'],
          ['Pieres', '7633'],
          ['San Manuel', '7007'],
          ['Tamangueyú', '7633'],
        ],
      },
      {
        nombre: 'Necochea',
        codigo: '06581',
        localidades: [
          ['Balneario Los Ángeles', '7641'],
          ['Claraz', '7005'],
          ['Costa Bonita', null],
          ['Energía', '7641'],
          ['Juan N. Fernández', '7011'],
          ['Necochea', '7630'],
          ['Nicanor Olivera', '7637'],
          ['Quequén', '7631'],
          ['Ramón Santamarina', '7641'],
        ],
      },
      {
        nombre: 'San Cayetano',
        codigo: '06742',
        localidades: [
          ['Balneario San Cayetano', '7521'],
          ['Cristiano Muerto', '7503'],
          ['Ochandío', '7521'],
          ['San Cayetano', '7521'],
        ],
      },
      {
        nombre: 'Tandil',
        codigo: '06791',
        localidades: [
          ['Azucena', '7005'],
          ['De la Canal', '7013'],
          ['Fulton', '7007'],
          ['Gardey', '7003'],
          ['Iraola', '7009'],
          ['María Ignacia', '7003'],
          ['Tandil', '7000'],
        ],
      },
    ],
  },
  {
    numero: 21,
    distritos: [
      {
        nombre: 'Adolfo Gonzales Chaves',
        codigo: '06014',
        localidades: [
          ['Adolfo Gonzales Chaves', '7513'],
          ['De La Garma', '7515'],
          ['Juan E. Barra', '7517'],
          ['Vásquez', '7519'],
        ],
      },
      {
        nombre: 'Benito Juárez',
        codigo: '06084',
        localidades: [
          ['Barker', '7005'],
          ['Benito Juárez', '7020'],
          ['López', '7021'],
          ['Tedín Uriburu', '7021'],
          ['Villa Cacique', '7005'],
        ],
      },
      {
        nombre: 'Coronel Dorrego',
        codigo: '06189',
        localidades: [
          ['Aparicio', '8158'],
          ['Coronel Dorrego', '8150'],
          ['El Perdido', null],
          ['Faro', '8150'],
          ['Irene', '7507'],
          ['Los Eucaliptus', '8150'],
          ['Marisol', '8153'],
          ['Oriente', '7509'],
          ['Paraje La Ruta', '8158'],
          ['San Román', '8154'],
        ],
      },
      {
        nombre: 'Coronel Pringles',
        codigo: '06196',
        localidades: [
          ['Coronel Pringles', '7530'],
          ['El Divisorio', '7531'],
          ['El Pensamiento', '7531'],
          ['Indio Rico', '7501'],
          ['Lartigau', '7531'],
        ],
      },
      {
        nombre: 'Laprida',
        codigo: '06448',
        localidades: [
          ['Laprida', '7414'],
          ['Pueblo Nuevo', '7414'],
          ['Pueblo San Jorge', '7404'],
        ],
      },
      {
        nombre: 'Tres Arroyos',
        codigo: '06833',
        localidades: [
          ['Balneario Orense', '7511'],
          ['Barrow', '7500'],
          ['Claromecó', '7505'],
          ['Copetonas', '7511'],
          ['Dunamar', null],
          ['Lin Calel', '7505'],
          ['Micaela Cascallares', '7507'],
          ['Orense', '7503'],
          ['Reta', '7511'],
          ['San Francisco de Bellocq', '7505'],
          ['San Mayol', '7519'],
          ['Tres Arroyos', '7500'],
          ['Villa Rodríguez', null],
        ],
      },
    ],
  },
  {
    numero: 22,
    distritos: [
      {
        nombre: 'Bahía Blanca',
        codigo: '06056',
        localidades: [
          ['Bahía Blanca', '8000'],
          ['Cabildo', '8118'],
          ['General Daniel Cerri', '8105'],
          ['Grünbein', '8101'],
          ['Ingeniero White', '8103'],
          ['Villa Bordeau', null],
          ['Villa Espora', '8107'],
        ],
      },
      {
        nombre: 'Coronel de Marina Leonardo Rosales',
        codigo: '06182',
        localidades: [
          ['Bajo Hondo', '8115'],
          ['Balneario Pehuen Co', '8109'],
          ['Calderón', '8101'],
          ['Pago Chico', null],
          ['Punta Alta', '8109'],
          ['Villa del Mar', '8109'],
          ['Villa General Arias', '8101'],
        ],
      },
      {
        nombre: 'Monte Hermoso',
        codigo: '06553',
        localidades: [
          ['Balneario Sauce Grande', '8153'],
          ['Monte Hermoso', '8153'],
        ],
      },
      {
        nombre: 'Patagones',
        codigo: '06602',
        localidades: [
          ['Bahía San Blas', '8506'],
          ['Cardenal Cagliero', '8506'],
          ['Carmen de Patagones', '8504'],
          ['José B. Casas', '8506'],
          ['Juan A. Pradere', '8142'],
          ['Stroeder', '8508'],
          ['Villa 7 de Marzo', '8504'],
          ['Villalonga', '8512'],
        ],
      },
      {
        nombre: 'Villarino',
        codigo: '06875',
        localidades: [
          ['Argerich', '8134'],
          ['Chapalco', '8132'],
          ['Colonia San Adolfo', '8142'],
          ['Country Los Medanos', null],
          ['Hilario Ascasubi', '8142'],
          ['Juan Cousté', '8136'],
          ['Lago Parque La Salada', '8148'],
          ['Mayor Buratovich', '8146'],
          ['Médanos', '8132'],
          ['Pedro Luro', '8148'],
          ['Teniente Origone', '8144'],
        ],
      },
    ],
  },
  {
    numero: 23,
    distritos: [
      {
        nombre: 'Adolfo Alsina',
        codigo: '06007',
        localidades: [
          ['Carhué', '6430'],
          ['Colonia San Miguel Arcángel', '8185'],
          ['Delfín Huergo', '8185'],
          ['Espartillar', '8171'],
          ['Esteban Agustín Gascón', '8185'],
          ['La Pala', '6341'],
          ['Maza', '6343'],
          ['Rivera', '6441'],
          ['Villa Margarita', '8185'],
          ['Yutuyaco', '6443'],
        ],
      },
      {
        nombre: 'Coronel Suárez',
        codigo: '06203',
        localidades: [
          ['Cascada', '7547'],
          ['Coronel Suárez', '7540'],
          ['Curamalal', '7548'],
          ['D\'Orbigny', '7541'],
          ['Huanguelén', '7545'],
          ['Pasman', '7547'],
          ['San José', '7541'],
          ['Santa María', '7541'],
          ['Santa Trinidad', '7541'],
          ['Villa La Arcadia', '7540'],
        ],
      },
      {
        nombre: 'Daireaux',
        codigo: '06231',
        localidades: [
          ['Andant', '6555'],
          ['Arboledas', '6557'],
          ['Daireaux', '6555'],
          ['La Larga', '6555'],
          ['La Manuela', '6439'],
          ['Salazar', '6471'],
        ],
      },
      {
        nombre: 'General La Madrid',
        codigo: '06322',
        localidades: [
          ['General La Madrid', '7406'],
          ['La Colina', '7408'],
          ['Las Martinetas', '7406'],
          ['Líbano', '7407'],
          ['Pontaut', '7535'],
        ],
      },
      {
        nombre: 'Guaminí',
        codigo: '06399',
        localidades: [
          ['Arroyo Venado', '6437'],
          ['Balneario Cochicó', '6435'],
          ['Casbas', '6417'],
          ['Garré', '6411'],
          ['Guaminí', '6435'],
          ['Laguna Alsina', '6439'],
        ],
      },
      {
        nombre: 'Puán',
        codigo: '06651',
        localidades: [
          ['17 de Agosto', '8129'],
          ['Azopardo', '8181'],
          ['Bordenave', '8187'],
          ['Darregueira', '8183'],
          ['Estela', '8127'],
          ['Felipe Solá', '8129'],
          ['López Lecube', '8117'],
          ['Puán', '8180'],
          ['San Germán', '8124'],
          ['Villa Castelar', '8181'],
          ['Villa Iris', '8126'],
        ],
      },
      {
        nombre: 'Saavedra',
        codigo: '06700',
        localidades: [
          ['Arroyo Corto', '8172'],
          ['Colonia San Martín', '8164'],
          ['Dufaur', '8164'],
          ['Espartillar', '8171'],
          ['Goyena', '8175'],
          ['Las Encadenadas', '8174'],
          ['Pigüé', '8170'],
          ['Saavedra', '8174'],
        ],
      },
      {
        nombre: 'Tornquist',
        codigo: '06819',
        localidades: [
          ['Chasicó', '8117'],
          ['La Gruta', '8160'],
          ['Pelicurá', '8117'],
          ['Saldungaray', '8166'],
          ['Sierra de la Ventana', '8168'],
          ['Tornquist', '8160'],
          ['Tres Picos', '8162'],
          ['Villa Ventana', '8160'],
        ],
      },
    ],
  },
  {
    numero: 24,
    distritos: [
      {
        nombre: '25 de Mayo',
        codigo: '06854',
        localidades: [
          ['25 de Mayo', '6660'],
          ['Agustín Mosconi', '6667'],
          ['Del Valle', '6509'],
          ['Ernestina', '6665'],
          ['Gobernador Ugarte', '6621'],
          ['Lucas Monteverde', '6661'],
          ['Norberto de la Riestra', '6663'],
          ['Pedernales', '6665'],
          ['San Enrique', '6661'],
          ['Valdés', '6667'],
        ],
      },
      {
        nombre: 'General Alvear',
        codigo: '06287',
        localidades: [
          ['General Alvear', '7263'],
        ],
      },
      {
        nombre: 'Las Flores',
        codigo: '06455',
        localidades: [
          ['Coronel Boerr', '7208'],
          ['El Trigo', '7207'],
          ['Las Flores', '7200'],
          ['Pardo', '7212'],
          ['Rosas', '7205'],
        ],
      },
      {
        nombre: 'Lobos',
        codigo: '06483',
        localidades: [
          ['Antonio Carboni', '7243'],
          ['Elvira', '7243'],
          ['Empalme Lobos', '7249'],
          ['La Federala', null],
          ['Laguna de Lobos', '7240'],
          ['Lobos', '7240'],
          ['Salvador María', '7241'],
          ['Zapiola', '7249'],
        ],
      },
      {
        nombre: 'Roque Pérez',
        codigo: '06693',
        localidades: [
          ['Carlos Beguerie', '7247'],
          ['Roque Pérez', '7245'],
        ],
      },
      {
        nombre: 'Saladillo',
        codigo: '06707',
        localidades: [
          ['Álvarez de Toledo', '7267'],
          ['Cazón', '7265'],
          ['Del Carril', '7265'],
          ['Polvaredas', '7267'],
          ['Saladillo', '7260'],
        ],
      },
    ],
  },
  {
    numero: 25,
    distritos: [
      {
        nombre: 'Azul',
        codigo: '06049',
        localidades: [
          ['16 de Julio', '7313'],
          ['Ariel', '7301'],
          ['Azul', '7300'],
          ['Cacharí', '7214'],
          ['Chillar', '7311'],
          ['Parish', '7316'],
        ],
      },
      {
        nombre: 'Bolívar',
        codigo: '06105',
        localidades: [
          ['Hale', '6511'],
          ['Juan F. Ibarra', '6551'],
          ['Paula', '6557'],
          ['Pirovano', '6551'],
          ['San Carlos de Bolívar', '6550'],
          ['Urdampilleta', '6553'],
          ['Villa Lynch Pueyrredón', '6553'],
        ],
      },
      {
        nombre: 'Olavarría',
        codigo: '06595',
        localidades: [
          ['Blancagrande', '6561'],
          ['Colonia Hinojo', '7318'],
          ['Colonia Nievas', '7318'],
          ['Colonia San Miguel', '7403'],
          ['Espigas', '6561'],
          ['Hinojo', '7318'],
          ['Olavarría', '7400'],
          ['Recalde', '6559'],
          ['Santa Luisa', '7401'],
          ['Sierra Chica', '7401'],
          ['Sierras Bayas', '7403'],
          ['Villa Alfredo Fortabat', '7403'],
          ['Villa Arrieta', null],
          ['Villa La Serranía', '7403'],
        ],
      },
      {
        nombre: 'Tapalqué',
        codigo: '06798',
        localidades: [
          ['Crotto', '7307'],
          ['Tapalqué', '7303'],
          ['Velloso', '7305'],
        ],
      },
    ],
  },
];

const ALIAS_DISTRITO = {
  'CORONEL ROSALES': 'CORONEL DE MARINA LEONARDO ROSALES',
  'GENERAL MADARIAGA': 'GENERAL JUAN MADARIAGA',
  'VEINTICINCO DE MAYO': '25 DE MAYO',
  'NUEVE DE JULIO': '9 DE JULIO',
  'SAN MIGUEL DEL MONTE': 'MONTE',
  'LEANDRO ALEM': 'LEANDRO N ALEM',
  'GENERAL LAMADRID': 'GENERAL LA MADRID',
};

class Simulacion extends Error {}

const norm = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
const normDistrito = (v) => ALIAS_DISTRITO[norm(v)] || norm(v);
const contador = () => ({ nuevos: 0, existentes: 0, completados: 0 });

async function sembrar(trx, informe) {
  const regiones = new Map((await trx('region')).map((r) => [norm(r.nombre), r]));
  const distritos = new Map((await trx('distrito')).map((r) => [normDistrito(r.nombre), r]));
  const localidades = new Map((await trx('localidad')).map((r) => [`${r.id_distrito}|${norm(r.nombre)}`, r]));
  const clavesDistrito = new Set();
  const clavesLocalidad = new Set();

  for (const region of REGIONES) {
    const nombreRegion = `Región ${region.numero}`;
    let filaRegion = regiones.get(norm(nombreRegion));
    if (filaRegion) {
      informe.region.existentes += 1;
    } else {
      [filaRegion] = await trx('region').insert({ nombre: nombreRegion }).returning('*');
      regiones.set(norm(nombreRegion), filaRegion);
      informe.region.nuevos += 1;
    }

    for (const distrito of region.distritos) {
      const claveDistrito = normDistrito(distrito.nombre);
      clavesDistrito.add(claveDistrito);
      let filaDistrito = distritos.get(claveDistrito);
      if (!filaDistrito) {
        [filaDistrito] = await trx('distrito').insert({ nombre: distrito.nombre, codigo: distrito.codigo }).returning('*');
        distritos.set(claveDistrito, filaDistrito);
        informe.distrito.nuevos += 1;
      } else if (filaDistrito.codigo) {
        informe.distrito.existentes += 1;
      } else {
        await trx('distrito').where('id_distrito', filaDistrito.id_distrito).update({ codigo: distrito.codigo });
        informe.distrito.completados += 1;
      }

      for (const [nombre, codigoPostal] of distrito.localidades) {
        const claveLocalidad = `${filaDistrito.id_distrito}|${norm(nombre)}`;
        clavesLocalidad.add(claveLocalidad);
        const filaLocalidad = localidades.get(claveLocalidad);
        if (!filaLocalidad) {
          const [nueva] = await trx('localidad').insert({
            id_distrito: filaDistrito.id_distrito,
            id_region: filaRegion.id_region,
            nombre,
            codigo: codigoPostal,
          }).returning('*');
          localidades.set(claveLocalidad, nueva);
          informe.localidad.nuevos += 1;
          continue;
        }
        if (filaLocalidad.id_region && filaLocalidad.id_region !== filaRegion.id_region) {
          informe.avisos.push(`${distrito.nombre} / ${nombre}: la base la tiene en otra región; se mantiene`);
        }
        const cambios = {};
        if (!filaLocalidad.id_region) cambios.id_region = filaRegion.id_region;
        if (!filaLocalidad.codigo && codigoPostal) cambios.codigo = codigoPostal;
        if (Object.keys(cambios).length) {
          await trx('localidad').where('id_localidad', filaLocalidad.id_localidad).update(cambios);
          informe.localidad.completados += 1;
        } else {
          informe.localidad.existentes += 1;
        }
      }
    }
  }

  for (const [clave, fila] of distritos) {
    if (!clavesDistrito.has(clave)) informe.distritosFueraDeLista.push(fila.nombre);
  }
  const nombresDistrito = new Map([...distritos.values()].map((d) => [d.id_distrito, d.nombre]));
  for (const [clave, fila] of localidades) {
    if (!clavesLocalidad.has(clave)) informe.localidadesFueraDeLista.push(`${nombresDistrito.get(fila.id_distrito)} / ${fila.nombre}`);
  }
}

async function main() {
  const simular = process.argv.includes('--simular');
  const informe = {
    region: contador(),
    distrito: contador(),
    localidad: contador(),
    avisos: [],
    distritosFueraDeLista: [],
    localidadesFueraDeLista: [],
  };

  try {
    await knex.transaction(async (trx) => {
      await sembrar(trx, informe);
      if (simular) throw new Simulacion();
    });
  } catch (err) {
    if (!(err instanceof Simulacion)) throw err;
  }

  console.log(simular ? 'SIMULACIÓN: no se guardó nada.' : 'Datos territoriales cargados.');
  for (const tabla of ['region', 'distrito', 'localidad']) {
    const c = informe[tabla];
    console.log(`  ${tabla}: ${c.nuevos} nuevos, ${c.completados} completados, ${c.existentes} sin cambios`);
  }
  for (const aviso of informe.avisos) console.log(`  Aviso: ${aviso}`);
  if (informe.distritosFueraDeLista.length) {
    console.log(`  Distritos en la base fuera de la lista (no se tocan): ${informe.distritosFueraDeLista.join(', ')}`);
  }
  if (informe.localidadesFueraDeLista.length) {
    console.log(`  Localidades en la base fuera de la lista (no se tocan): ${informe.localidadesFueraDeLista.join('; ')}`);
  }
}

main()
  .then(() => knex.destroy())
  .catch(async (err) => {
    console.error('Error en seed territorial:', err);
    await knex.destroy();
    process.exit(1);
  });
