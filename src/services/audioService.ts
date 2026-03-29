
/**
 * 
 * @param uri file's uri
 * @param name file's name
 * @returns returns response as a string or throws Error
 */
export const uploadAudio = async (uri: string, name: string) => {
  const formData = new FormData();
  formData.append("file", {
    uri,
    type: "audio/*",    // mozda preko ffmpeg-a naci tip fajla pa dinamicki setovati ovo polje
    //name: "recording.mp3",    
    name: name,
  } as any);

  const response = await fetch("http://192.168.100.25:8080/upload", {//("http://localhost:8080/upload", {
    method: "POST",
    body: formData,
    // headers: {
    //     "Content-Type": "multipart/form-data",
    // },
  });

  if(!response.ok) {
    throw new Error(`Upload failed ${response.status}`);
  }
  return await response.text();
//   return await response.json();  // moze i tako ali treba podesiti na backu da se vraca json
}